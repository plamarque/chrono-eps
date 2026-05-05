import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import HomeView from './HomeView.vue'
import Chronometre from '../components/Chronometre.vue'

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

/** Coque minimale pour que `onBeforeRouteLeave` dans HomeView soit enregistré (enfant de router-view). */
const HomeViewTestShell = defineComponent({
  name: 'HomeViewTestShell',
  setup() {
    return () => h(RouterView)
  }
})

async function mountHomeView(routerOptions = {}) {
  const router = createTestRouter(
    routerOptions.path ?? '/',
    routerOptions.query ?? {}
  )
  await router.isReady()

  const shell = mount(HomeViewTestShell, {
    global: {
      plugins: [PrimeVue, ToastService, ConfirmationService, router],
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

  const wrapper = shell.findComponent(HomeView)
  expect(wrapper.exists()).toBe(true)

  return { wrapper, router, shell }
}

/**
 * Distinction des boutons :
 * - Nouvelle course (toolbar) : reset complet (efface participants, groupes, passages)
 * - Dupliquer (chronomètre) : conserve config, efface uniquement temps et passages
 * - Réinitialiser (chronomètre, chrono en pause) : conserve config, remet chrono à zéro
 */
describe('HomeView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockLoadCourse.mockReset()
  })

  it('bouton Enregistrer activé quand pas de course chargée et chrono à l\'arrêt (sans passages)', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Enregistrer'))
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
    shell.unmount()
  })

  it('bouton Enregistrer désactivé pendant que le chrono tourne', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    expect(demarrer.exists()).toBe(true)
    await demarrer.trigger('click')
    await vi.advanceTimersByTimeAsync(10)

    const enregistrer = wrapper.findAll('button').find((b) => b.text().includes('Enregistrer'))
    expect(enregistrer.exists()).toBe(true)
    expect(enregistrer.attributes('disabled')).toBeDefined()
    shell.unmount()
  })

  it('bouton Enregistrer activé après arrêt du chrono même sans passages', async () => {
    const { wrapper, shell } = await mountHomeView()
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
    shell.unmount()
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
      groupRunners: { g1: [{ id: 's1', nom: 'Alice', ordre: 0 }] }
    }
    mockLoadCourse.mockResolvedValue(preparedCourse)

    const { wrapper, shell } = await mountHomeView({
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
    shell.unmount()
  })

  it('modal Enregistrer prérempli avec Course du [date] [heure] pour une nouvelle course', async () => {
    vi.setSystemTime(new Date('2025-02-26T14:45:00')) // 26 février 2025, 14:45

    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const enregistrer = wrapper.findAll('button').find((b) => b.text().includes('Enregistrer'))
    await enregistrer.trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="course-nom-input"]')
    expect(input.element.value).toBe('Course du 26 février 14:45')

    vi.useRealTimers()
    shell.unmount()
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
      groupRunners: { g1: [{ id: 's1', nom: 'Alice', ordre: 0 }] }
    }
    mockLoadCourse.mockResolvedValue(preparedCourse)

    const { wrapper, shell } = await mountHomeView({
      path: '/',
      query: { loadCourseId: preparedCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    expect(demarrer.exists()).toBe(true)
    shell.unmount()
  })

  it('Dupliquer (chronomètre) : conserve la config des coureurs et efface uniquement les temps', async () => {
    const savedCourse = {
      id: 'saved-indiv-1',
      nom: 'Course enregistrée',
      participants: [
        { id: '1', nom: 'Coureur 1', color: '#ef4444' },
        { id: '2', nom: 'Coureur 2', color: '#3b82f6' }
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

    const { wrapper, shell } = await mountHomeView({
      path: '/',
      query: { loadCourseId: savedCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-course-title').exists()).toBe(true)
    expect(wrapper.vm.participants).toHaveLength(2)

    // Clic sur le bouton « Dupliquer » du Chronomètre (réutiliser la config, effacer les temps)
    const chronometre = wrapper.findComponent(Chronometre)
    const dupliquerBtn = chronometre.findAll('button').find((b) => b.text() === 'Dupliquer')
    expect(dupliquerBtn.exists()).toBe(true)
    await dupliquerBtn.trigger('click')
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-course-title').exists()).toBe(false)
    expect(wrapper.vm.participants).toHaveLength(2)
    expect(wrapper.vm.participants.map((p) => p.nom)).toEqual(['Coureur 1', 'Coureur 2'])
    expect(Object.keys(wrapper.vm.passagesByParticipant)).toHaveLength(0)
    shell.unmount()
  })

  it('newFromCourseId charge en mode template : groupes/coureurs conservés, pas de nom ni passages', async () => {
    const sourceCourse = {
      id: 'source-1',
      nom: 'Course du 10 février',
      participants: [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }],
      passagesByParticipant: { g1: [{ tourNum: 1, lapMs: 60000, totalMs: 60000 }] },
      chronoStartMs: 1000,
      statusAtSave: 'paused',
      mode: 'relay',
      groupRunners: { g1: [{ id: 's1', nom: 'Alice', ordre: 0 }, { id: 's2', nom: 'Bob', ordre: 1 }] }
    }
    mockLoadCourse.mockResolvedValue(sourceCourse)

    const { wrapper, shell } = await mountHomeView({
      path: '/',
      query: { newFromCourseId: sourceCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(mockLoadCourse).toHaveBeenCalledWith('source-1')
    expect(wrapper.find('.home-course-title').exists()).toBe(false)
    expect(wrapper.text()).toContain('Groupe 1')
    expect(wrapper.text()).toContain('Alice')
    shell.unmount()
  })

  it('newFromCourseId mode individuel : config des coureurs conservée, temps réinitialisés', async () => {
    const sourceCourse = {
      id: 'source-indiv-1',
      nom: 'Course individuelle',
      participants: [
        { id: '1', nom: 'Coureur 1', color: '#ef4444' },
        { id: '2', nom: 'Coureur 2', color: '#3b82f6' },
        { id: '3', nom: 'Coureur 3', color: '#22c55e' }
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

    const { wrapper, shell } = await mountHomeView({
      path: '/',
      query: { newFromCourseId: sourceCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(mockLoadCourse).toHaveBeenCalledWith('source-indiv-1')
    expect(wrapper.find('.home-course-title').exists()).toBe(false)
    expect(wrapper.text()).toContain('Coureur 1')
    expect(wrapper.text()).toContain('Coureur 2')
    expect(wrapper.text()).toContain('Coureur 3')
    expect(wrapper.vm.participants).toHaveLength(3)
    expect(wrapper.vm.participants.map((p) => p.nom)).toEqual(['Coureur 1', 'Coureur 2', 'Coureur 3'])
    expect(Object.keys(wrapper.vm.passagesByParticipant)).toHaveLength(0)
    expect(wrapper.vm.currentCourse).toBeNull()
    shell.unmount()
  })

  it('newFromCourseId mode individuel avec passages : participants triés par temps croissant', async () => {
    const sourceCourse = {
      id: 'source-tri-1',
      nom: 'Course à trier',
      participants: [
        { id: '1', nom: 'Coureur 1', color: '#ef4444' },
        { id: '2', nom: 'Coureur 2', color: '#3b82f6' },
        { id: '3', nom: 'Coureur 3', color: '#22c55e' }
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

    const { wrapper, shell } = await mountHomeView({
      path: '/',
      query: { newFromCourseId: sourceCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants.map((p) => p.nom)).toEqual([
      'Coureur 2',
      'Coureur 1',
      'Coureur 3'
    ])
    expect(Object.keys(wrapper.vm.passagesByParticipant)).toHaveLength(0)
    shell.unmount()
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

    const { wrapper, shell } = await mountHomeView({
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
    shell.unmount()
  })

  it('changement de mode avec config non sauvegardée : dialogue de confirmation (mode inchangé tant que non confirmé)', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    expect(wrapper.vm.mode).toBe('relay')
    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await vi.advanceTimersByTimeAsync(10)

    const individuelBtn = wrapper.findAll('button').find((b) => b.text() === 'Individuel')
    expect(individuelBtn.exists()).toBe(true)
    await individuelBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.mode).toBe('relay')
    shell.unmount()
  })

  it('changement de mode sans config à perdre : bascule immédiate', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    expect(wrapper.vm.mode).toBe('relay')
    const individuelBtn = wrapper.findAll('button').find((b) => b.text() === 'Individuel')
    await individuelBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.mode).toBe('individual')
    shell.unmount()
  })

  it('recliquer sur Individuel en mode individuel garde le mode individuel', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const individuelBtn = wrapper.findAll('button').find((b) => b.text() === 'Individuel')
    await individuelBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.mode).toBe('individual')

    // Recliquer sur Individuel ne doit pas basculer en relais
    await individuelBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.mode).toBe('individual')
    shell.unmount()
  })

  it('onModeChange(null) ne change pas le mode (désélection ignorée)', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    wrapper.vm.mode = 'individual'
    wrapper.vm.onModeChange(null)
    expect(wrapper.vm.mode).toBe('individual')

    wrapper.vm.mode = 'relay'
    wrapper.vm.onModeChange(null)
    expect(wrapper.vm.mode).toBe('relay')

    shell.unmount()
  })

  it('Nouvelle course (toolbar) : toujours visible sur l\'écran d\'accueil', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const toolbar = wrapper.find('.home-toolbar')
    const nouvelleCourseBtn = toolbar.findAll('button').find((b) => b.text() === 'Nouvelle course')
    expect(nouvelleCourseBtn.exists()).toBe(true)
    shell.unmount()
  })

  it('Nouvelle course (toolbar) avec config en cours : dialogue de confirmation, pas de reset sans accepter', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await vi.advanceTimersByTimeAsync(10)

    const nouvelleCourseBtn = wrapper.find('.home-toolbar').findAll('button').find((b) => b.text() === 'Nouvelle course')
    await nouvelleCourseBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.status).toBe('running')
    shell.unmount()
  })

  it('individuel : en course, Coureur ajoute un nouveau coureur synchronisé sans passage implicite', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    await wrapper.findAll('button').find((b) => b.text() === 'Individuel').trigger('click')
    await wrapper.vm.$nextTick()

    const idC1 = wrapper.vm.participants[0].id
    await wrapper.findAll('button').find((b) => b.text() === 'Démarrer').trigger('click')
    await vi.advanceTimersByTimeAsync(80)

    const coureurBtn = wrapper.find('[aria-labelledby="chrono-heading"]').find(
      '[aria-label="Ajouter un coureur qui passe devant le chronomètre"]'
    )
    await coureurBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants).toHaveLength(2)
    const c2 = wrapper.vm.participants[1]
    expect(wrapper.vm.passagesByParticipant[idC1]?.length ?? 0).toBe(0)
    expect(wrapper.vm.participantStates[c2.id].status).toBe('running')
    expect(wrapper.vm.participantStates[idC1].status).toBe('running')
    shell.unmount()
  })

  it('individuel : chrono au repos, Coureur ajoute une carte sans tour sur le précédent', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    await wrapper.findAll('button').find((b) => b.text() === 'Individuel').trigger('click')
    await wrapper.vm.$nextTick()

    const idC1 = wrapper.vm.participants[0].id
    const coureurBtn = wrapper.find('[aria-labelledby="chrono-heading"]').find(
      '[aria-label="Ajouter un coureur qui passe devant le chronomètre"]'
    )
    await coureurBtn.trigger('click')
    await wrapper.vm.$nextTick()

    const c2 = wrapper.vm.participants[1]
    expect(wrapper.vm.passagesByParticipant[idC1]?.length ?? 0).toBe(0)
    expect(wrapper.vm.participantStates[c2.id].status).toBe('idle')
    shell.unmount()
  })

  it('Réinitialiser avec passages : dialogue de confirmation, pas de reset sans accepter', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const individuelBtn = wrapper.findAll('button').find((b) => b.text() === 'Individuel')
    await individuelBtn.trigger('click')
    await wrapper.vm.$nextTick()

    const coureurBtn = wrapper.find('[aria-labelledby="chrono-heading"]').find(
      '[aria-label="Ajouter un coureur qui passe devant le chronomètre"]'
    )
    expect(coureurBtn.exists()).toBe(true)
    await coureurBtn.trigger('click')
    await wrapper.vm.$nextTick()

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await vi.advanceTimersByTimeAsync(10)

    const arreter = wrapper.findAll('button').find((b) => b.text() === 'Arrêter')
    await arreter.trigger('click')
    await vi.advanceTimersByTimeAsync(0)

    const passageCount = Object.values(wrapper.vm.passagesByParticipant).filter(
      (arr) => Array.isArray(arr) && arr.length > 0
    ).length
    expect(passageCount).toBeGreaterThan(0)

    const reinit = wrapper.findAll('button').find((b) => b.text() === 'Réinitialiser')
    expect(reinit?.exists()).toBe(true)
    await reinit.trigger('click')
    await wrapper.vm.$nextTick()

    const passageCountAfter = Object.values(wrapper.vm.passagesByParticipant).filter(
      (arr) => Array.isArray(arr) && arr.length > 0
    ).length
    expect(passageCountAfter).toBe(passageCount)
    shell.unmount()
  })

  it('Nouvelle course (toolbar) sans config à perdre : reset complet immédiat', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    expect(wrapper.vm.mode).toBe('relay')
    expect(wrapper.vm.participants).toHaveLength(1)

    const nouvelleCourseBtn = wrapper.find('.home-toolbar').findAll('button').find((b) => b.text() === 'Nouvelle course')
    await nouvelleCourseBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants).toHaveLength(1)
    expect(wrapper.vm.currentCourse).toBeNull()
    shell.unmount()
  })

  it('Nouvelle course (toolbar) : startNewCourse efface toute la config (vs Dupliquer qui la conserve)', async () => {
    const savedCourse = {
      id: 'saved-1',
      nom: 'Course test',
      participants: [
        { id: '1', nom: 'Alice', color: '#ef4444' },
        { id: '2', nom: 'Bob', color: '#3b82f6' }
      ],
      passagesByParticipant: { '1': [{ tourNum: 1, lapMs: 45000, totalMs: 45000 }] },
      chronoStartMs: 1000,
      statusAtSave: 'paused',
      mode: 'individual'
    }
    mockLoadCourse.mockResolvedValue(savedCourse)

    const { wrapper, shell } = await mountHomeView({ path: '/', query: { loadCourseId: savedCourse.id } })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants).toHaveLength(2)

    wrapper.vm.startNewCourse()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants).toHaveLength(1)
    expect(wrapper.vm.currentCourse).toBeNull()
    expect(Object.keys(wrapper.vm.passagesByParticipant)).toHaveLength(0)
    shell.unmount()
  })

  it('changement Individuel → Relais avec chrono en cours : dialogue de confirmation', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    const individuelBtn = wrapper.findAll('button').find((b) => b.text() === 'Individuel')
    await individuelBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.mode).toBe('individual')

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await vi.advanceTimersByTimeAsync(10)

    const relaisBtn = wrapper.findAll('button').find((b) => b.text() === 'Relais')
    await relaisBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.mode).toBe('individual')
    shell.unmount()
  })

  it('mode relais : chaque nouveau groupe a Coureur 1 par défaut (numérotation locale)', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    expect(wrapper.vm.mode).toBe('relay')
    expect(wrapper.vm.participants).toHaveLength(1)
    const g1 = wrapper.vm.participants[0]
    expect(wrapper.vm.groupRunners[g1.id]).toHaveLength(1)
    expect(wrapper.vm.groupRunners[g1.id][0].nom).toBe('Coureur 1')

    const addGroupBtn = wrapper.find('button[aria-label="Ajouter"]')
    await addGroupBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants).toHaveLength(2)
    const g2 = wrapper.vm.participants[1]
    expect(wrapper.vm.groupRunners[g2.id]).toHaveLength(1)
    expect(wrapper.vm.groupRunners[g2.id][0].nom).toBe('Coureur 1')
    shell.unmount()
  })

  it('mode relais : config groupe verrouillée pendant running puis réouverte après arrêt', async () => {
    const { wrapper, shell } = await mountHomeView()
    await vi.advanceTimersByTimeAsync(0)

    expect(wrapper.vm.mode).toBe('relay')
    const header = wrapper.find('.tableau-relay-header')
    expect(header.exists()).toBe(true)
    expect(header.attributes('role')).toBe('button')

    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await vi.advanceTimersByTimeAsync(10)
    await wrapper.vm.$nextTick()

    const lockedHeader = wrapper.find('.tableau-relay-header')
    expect(lockedHeader.attributes('role')).toBeUndefined()
    expect(lockedHeader.attributes('tabindex')).toBe('-1')

    const arreter = wrapper.findAll('button').find((b) => b.text() === 'Arrêter')
    await arreter.trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    await wrapper.vm.$nextTick()

    const unlockedHeader = wrapper.find('.tableau-relay-header')
    expect(unlockedHeader.attributes('role')).toBe('button')
    expect(unlockedHeader.attributes('tabindex')).toBe('0')
    shell.unmount()
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

    const { wrapper, shell } = await mountHomeView({
      path: '/',
      query: { newFromCourseId: sourceCourse.id }
    })
    await vi.runAllTimersAsync()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.participants[0].nom).toBe('Avec temps')
    expect(wrapper.vm.participants.map((p) => p.nom)).toContain('Sans passage 1')
    expect(wrapper.vm.participants.map((p) => p.nom)).toContain('Sans passage 2')
    shell.unmount()
  })
})
