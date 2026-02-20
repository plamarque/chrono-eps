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
})
