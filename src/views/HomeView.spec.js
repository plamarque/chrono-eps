import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import HomeView from './HomeView.vue'

const mockLoadCourse = vi.fn()
vi.mock('../services/courseStore.js', () => ({
  saveCourse: vi.fn(),
  loadCourse: (id) => mockLoadCourse(id)
}))

const createTestRouter = (initialPath = '/', initialQuery = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/historique', name: 'historique', component: { template: '<div/>' } }
    ]
  })
  router.push({ path: initialPath, query: initialQuery })
  return router
}

async function mountHomeView(routerOptions = {}) {
  const router = createTestRouter(
    routerOptions.path ?? '/',
    routerOptions.query ?? {}
  )
  await router.isReady()

  const wrapper = mount(HomeView, {
    global: {
      plugins: [PrimeVue, ToastService, router],
      stubs: {
        Dialog: {
          template: '<div v-if="visible"><slot></slot><slot name="footer"></slot></div>',
          props: ['visible']
        },
        InputText: {
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" data-testid="course-nom-input" />',
          props: ['modelValue']
        }
      }
    }
  })

  return { wrapper, router }
}

describe('HomeView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockLoadCourse.mockReset()
  })

  it('bouton Enregistrer activé quand pas de course chargée et chrono à l\'arrêt (sans passages)', async () => {
    const { wrapper } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Enregistrer'))
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('bouton Enregistrer désactivé pendant que le chrono tourne', async () => {
    const { wrapper } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    expect(demarrer.exists()).toBe(true)
    await demarrer.trigger('click')
    await vi.advanceTimersByTimeAsync(10)

    const enregistrer = wrapper.findAll('button').find((b) => b.text().includes('Enregistrer'))
    expect(enregistrer.exists()).toBe(true)
    expect(enregistrer.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('bouton Enregistrer activé après arrêt du chrono même sans passages', async () => {
    const { wrapper } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await vi.advanceTimersByTimeAsync(10)

    const arreter = wrapper.findAll('button').find((b) => b.text() === 'Arrêter')
    await arreter.trigger('click')
    await vi.advanceTimersByTimeAsync(0)

    const enregistrer = wrapper.findAll('button').find((b) => b.text().includes('Enregistrer'))
    expect(enregistrer.exists()).toBe(true)
    expect(enregistrer.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('modal Enregistrer prérempli avec le nom de la course préparée', async () => {
    const preparedCourse = {
      id: 'prepared-1',
      nom: 'Équipe du 20 février',
      participants: [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }],
      passagesByParticipant: {},
      chronoStartMs: null,
      statusAtSave: 'idle',
      mode: 'relay',
      groupStudents: { g1: [{ id: 's1', nom: 'Alice', ordre: 0 }] }
    }
    mockLoadCourse.mockResolvedValue(preparedCourse)

    const { wrapper } = await mountHomeView({
      path: '/',
      query: { loadCourseId: preparedCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await vi.advanceTimersByTimeAsync(10)

    const arreter = wrapper.findAll('button').find((b) => b.text() === 'Arrêter')
    await arreter.trigger('click')
    await vi.advanceTimersByTimeAsync(0)

    const enregistrer = wrapper.findAll('button').find((b) => b.text().includes('Enregistrer'))
    await enregistrer.trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="course-nom-input"]')
    expect(input.element.value).toBe('Équipe du 20 février')
    wrapper.unmount()
  })

  it('course préparée : bouton Démarrer visible pour lancer la course', async () => {
    const preparedCourse = {
      id: 'prepared-1',
      nom: 'Équipe préparée',
      participants: [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }],
      passagesByParticipant: {},
      chronoStartMs: null,
      statusAtSave: 'idle',
      mode: 'relay',
      groupStudents: { g1: [{ id: 's1', nom: 'Alice', ordre: 0 }] }
    }
    mockLoadCourse.mockResolvedValue(preparedCourse)

    const { wrapper } = await mountHomeView({
      path: '/',
      query: { loadCourseId: preparedCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    expect(demarrer.exists()).toBe(true)
    wrapper.unmount()
  })

  it('cliquer Nouvelle course sur une course chargée (individuel) conserve la config des élèves et efface les temps', async () => {
    const savedCourse = {
      id: 'saved-indiv-1',
      nom: 'Course enregistrée',
      participants: [
        { id: '1', nom: 'Elève 1', color: '#ef4444' },
        { id: '2', nom: 'Elève 2', color: '#3b82f6' }
      ],
      passagesByParticipant: {
        '1': [{ tourNum: 1, lapMs: 45000, totalMs: 45000 }],
        '2': [{ tourNum: 1, lapMs: 50000, totalMs: 50000 }]
      },
      chronoStartMs: 1000,
      statusAtSave: 'paused',
      mode: 'individual'
    }
    mockLoadCourse.mockResolvedValue(savedCourse)

    const { wrapper } = await mountHomeView({
      path: '/',
      query: { loadCourseId: savedCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-course-title').exists()).toBe(true)
    expect(wrapper.vm.participants).toHaveLength(2)

    const nouvelleCourseBtn = wrapper.findAll('button').find((b) => b.text() === 'Nouvelle course')
    expect(nouvelleCourseBtn.exists()).toBe(true)
    await nouvelleCourseBtn.trigger('click')
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-course-title').exists()).toBe(false)
    expect(wrapper.vm.participants).toHaveLength(2)
    expect(wrapper.vm.participants.map((p) => p.nom)).toEqual(['Elève 1', 'Elève 2'])
    expect(Object.keys(wrapper.vm.passagesByParticipant)).toHaveLength(0)
    wrapper.unmount()
  })

  it('newFromCourseId charge en mode template : groupes/élèves conservés, pas de nom ni passages', async () => {
    const sourceCourse = {
      id: 'source-1',
      nom: 'Course du 10 février',
      participants: [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }],
      passagesByParticipant: { g1: [{ tourNum: 1, lapMs: 60000, totalMs: 60000 }] },
      chronoStartMs: 1000,
      statusAtSave: 'paused',
      mode: 'relay',
      groupStudents: { g1: [{ id: 's1', nom: 'Alice', ordre: 0 }, { id: 's2', nom: 'Bob', ordre: 1 }] }
    }
    mockLoadCourse.mockResolvedValue(sourceCourse)

    const { wrapper } = await mountHomeView({
      path: '/',
      query: { newFromCourseId: sourceCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(mockLoadCourse).toHaveBeenCalledWith('source-1')
    expect(wrapper.find('.home-course-title').exists()).toBe(false)
    expect(wrapper.text()).toContain('Groupe 1')
    expect(wrapper.text()).toContain('Alice')
    wrapper.unmount()
  })

  it('newFromCourseId mode individuel : config des coureurs conservée, temps réinitialisés', async () => {
    const sourceCourse = {
      id: 'source-indiv-1',
      nom: 'Course individuelle',
      participants: [
        { id: '1', nom: 'Elève 1', color: '#ef4444' },
        { id: '2', nom: 'Elève 2', color: '#3b82f6' },
        { id: '3', nom: 'Elève 3', color: '#22c55e' }
      ],
      passagesByParticipant: {
        '1': [{ tourNum: 1, lapMs: 45000, totalMs: 45000 }],
        '2': [{ tourNum: 1, lapMs: 50000, totalMs: 50000 }],
        '3': [{ tourNum: 1, lapMs: 55000, totalMs: 55000 }]
      },
      chronoStartMs: 1000,
      statusAtSave: 'paused',
      mode: 'individual'
    }
    mockLoadCourse.mockResolvedValue(sourceCourse)

    const { wrapper } = await mountHomeView({
      path: '/',
      query: { newFromCourseId: sourceCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(mockLoadCourse).toHaveBeenCalledWith('source-indiv-1')
    expect(wrapper.find('.home-course-title').exists()).toBe(false)
    expect(wrapper.text()).toContain('Elève 1')
    expect(wrapper.text()).toContain('Elève 2')
    expect(wrapper.text()).toContain('Elève 3')
    expect(wrapper.vm.participants).toHaveLength(3)
    expect(wrapper.vm.participants.map((p) => p.nom)).toEqual(['Elève 1', 'Elève 2', 'Elève 3'])
    expect(Object.keys(wrapper.vm.passagesByParticipant)).toHaveLength(0)
    expect(wrapper.vm.currentCourse).toBeNull()
    wrapper.unmount()
  })

  it('newFromCourseId mode individuel avec passages : participants triés par temps croissant', async () => {
    const sourceCourse = {
      id: 'source-tri-1',
      nom: 'Course à trier',
      participants: [
        { id: '1', nom: 'Elève 1', color: '#ef4444' },
        { id: '2', nom: 'Elève 2', color: '#3b82f6' },
        { id: '3', nom: 'Elève 3', color: '#22c55e' }
      ],
      passagesByParticipant: {
        '1': [{ tourNum: 1, lapMs: 90000, totalMs: 90000 }],
        '2': [{ tourNum: 1, lapMs: 60000, totalMs: 60000 }],
        '3': [{ tourNum: 1, lapMs: 120000, totalMs: 120000 }]
      },
      chronoStartMs: 1000,
      statusAtSave: 'paused',
      mode: 'individual'
    }
    mockLoadCourse.mockResolvedValue(sourceCourse)

    const { wrapper } = await mountHomeView({
      path: '/',
      query: { newFromCourseId: sourceCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants.map((p) => p.nom)).toEqual([
      'Elève 2',
      'Elève 1',
      'Elève 3'
    ])
    expect(Object.keys(wrapper.vm.passagesByParticipant)).toHaveLength(0)
    wrapper.unmount()
  })

  it('newFromCourseId mode individuel sans passages : ordre conservé', async () => {
    const sourceCourse = {
      id: 'source-nopass-1',
      nom: 'Course sans passages',
      participants: [
        { id: '1', nom: 'Alice' },
        { id: '2', nom: 'Bob' },
        { id: '3', nom: 'Charlie' }
      ],
      passagesByParticipant: {},
      chronoStartMs: null,
      statusAtSave: 'idle',
      mode: 'individual'
    }
    mockLoadCourse.mockResolvedValue(sourceCourse)

    const { wrapper } = await mountHomeView({
      path: '/',
      query: { newFromCourseId: sourceCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants.map((p) => p.nom)).toEqual([
      'Alice',
      'Bob',
      'Charlie'
    ])
    wrapper.unmount()
  })

  it('newFromCourseId mode individuel : participants sans passage en fin de liste', async () => {
    const sourceCourse = {
      id: 'source-mix-1',
      nom: 'Course mixte',
      participants: [
        { id: '1', nom: 'Sans passage 1' },
        { id: '2', nom: 'Avec temps' },
        { id: '3', nom: 'Sans passage 2' }
      ],
      passagesByParticipant: {
        '2': [{ tourNum: 1, lapMs: 50000, totalMs: 50000 }]
      },
      chronoStartMs: 1000,
      statusAtSave: 'paused',
      mode: 'individual'
    }
    mockLoadCourse.mockResolvedValue(sourceCourse)

    const { wrapper } = await mountHomeView({
      path: '/',
      query: { newFromCourseId: sourceCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants[0].nom).toBe('Avec temps')
    expect(wrapper.vm.participants.map((p) => p.nom)).toContain('Sans passage 1')
    expect(wrapper.vm.participants.map((p) => p.nom)).toContain('Sans passage 2')
    wrapper.unmount()
  })
})
