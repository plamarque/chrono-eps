import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Chronometre from './Chronometre.vue'

function mountChronometre(props = {}) {
  return mount(Chronometre, {
    props: {
      elapsedMs: props.elapsedMs ?? 0,
      status: props.status ?? 'idle',
      isViewingLoadedCourse: props.isViewingLoadedCourse ?? false,
      showAddCoureur: props.showAddCoureur ?? false
    },
    global: {
      stubs: {
        Button: {
          props: ['label', 'ariaLabel'],
          template:
            '<button type="button" :aria-label="$attrs[\'aria-label\'] || ariaLabel" @click="$emit(\'click\')">{{ label }}</button>',
          inheritAttrs: true
        }
      }
    }
  })
}

/**
 * Boutons du chronomètre :
 * - Réinitialiser : chrono en pause, garde config, efface passages
 * - Dupliquer : course chargée avec passages, garde config, efface temps (parent gère doLoadCourseAsTemplate)
 */
describe('Chronometre', () => {
  it('affiche le temps à partir des props', () => {
    const wrapper = mountChronometre({ elapsedMs: 65000 })
    expect(wrapper.find('[role="timer"]').text()).toBe('01:05.00')
    wrapper.unmount()
  })

  it('affiche 00:00.00 quand elapsedMs est 0', () => {
    const wrapper = mountChronometre({ elapsedMs: 0 })
    expect(wrapper.find('[role="timer"]').text()).toBe('00:00.00')
    wrapper.unmount()
  })

  it('affiche le bouton Démarrer quand status est idle', () => {
    const wrapper = mountChronometre({ status: 'idle' })
    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    expect(demarrer.exists()).toBe(true)
    wrapper.unmount()
  })

  it('affiche Arrêter quand status est running', () => {
    const wrapper = mountChronometre({ status: 'running' })
    const arreter = wrapper.findAll('button').find((b) => b.text() === 'Arrêter')
    expect(arreter.exists()).toBe(true)
    wrapper.unmount()
  })

  it('affiche Réinitialiser quand status est paused (garde la config, efface passages)', () => {
    const wrapper = mountChronometre({ status: 'paused' })
    const reset = wrapper.findAll('button').find((b) => b.text() === 'Réinitialiser')
    expect(reset.exists()).toBe(true)
    wrapper.unmount()
  })

  it('émet start au clic sur Démarrer', async () => {
    const wrapper = mountChronometre({ status: 'idle' })
    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    expect(wrapper.emitted('start')).toBeTruthy()
    expect(wrapper.emitted('start').length).toBeGreaterThanOrEqual(1)
    wrapper.unmount()
  })

  it('émet stop au clic sur Arrêter', async () => {
    const wrapper = mountChronometre({ status: 'running' })
    const arreter = wrapper.findAll('button').find((b) => b.text() === 'Arrêter')
    await arreter.trigger('click')
    expect(wrapper.emitted('stop')).toBeTruthy()
    expect(wrapper.emitted('stop').length).toBeGreaterThanOrEqual(1)
    wrapper.unmount()
  })

  it('émet reset au clic sur Réinitialiser', async () => {
    const wrapper = mountChronometre({ status: 'paused' })
    const reset = wrapper.findAll('button').find((b) => b.text() === 'Réinitialiser')
    await reset.trigger('click')
    expect(wrapper.emitted('reset')).toBeTruthy()
    expect(wrapper.emitted('reset').length).toBeGreaterThanOrEqual(1)
    wrapper.unmount()
  })

  it('affiche Dupliquer (et masque Démarrer) quand isViewingLoadedCourse — conserve config, efface temps', () => {
    const wrapper = mountChronometre({ status: 'idle', isViewingLoadedCourse: true })
    const buttons = wrapper.findAll('button')
    expect(buttons.some((b) => b.text() === 'Dupliquer')).toBe(true)
    expect(buttons.some((b) => b.text() === 'Démarrer')).toBe(false)
    wrapper.unmount()
  })

  it('émet reset au clic sur Dupliquer (le parent gère doLoadCourseAsTemplate)', async () => {
    const wrapper = mountChronometre({ status: 'idle', isViewingLoadedCourse: true })
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Dupliquer')
    await btn.trigger('click')
    expect(wrapper.emitted('reset')).toBeTruthy()
    wrapper.unmount()
  })

  it('n’affiche pas le bouton Coureur sans showAddCoureur', () => {
    const wrapper = mountChronometre({ status: 'idle', showAddCoureur: false })
    expect(
      wrapper.find('button[aria-label="Ajouter un coureur qui passe devant le chronomètre"]').exists()
    ).toBe(false)
    wrapper.unmount()
  })

  it('affiche Coureur après Démarrer quand showAddCoureur et chrono idle', () => {
    const wrapper = mountChronometre({ status: 'idle', showAddCoureur: true })
    const labels = wrapper.findAll('button').map((b) => b.text())
    const iDem = labels.indexOf('Démarrer')
    const iCou = labels.indexOf('Coureur')
    expect(iDem).toBeGreaterThanOrEqual(0)
    expect(iCou).toBeGreaterThan(iDem)
    wrapper.unmount()
  })

  it('affiche Coureur après Arrêter en running avec showAddCoureur', () => {
    const wrapper = mountChronometre({ status: 'running', showAddCoureur: true })
    const labels = wrapper.findAll('button').map((b) => b.text())
    const iArr = labels.indexOf('Arrêter')
    const iCou = labels.indexOf('Coureur')
    expect(iArr).toBeGreaterThanOrEqual(0)
    expect(iCou).toBeGreaterThan(iArr)
    wrapper.unmount()
  })

  it('masque Coureur en lecture course chargée (isViewingLoadedCourse)', () => {
    const wrapper = mountChronometre({
      status: 'idle',
      showAddCoureur: true,
      isViewingLoadedCourse: true
    })
    expect(
      wrapper.find('button[aria-label="Ajouter un coureur qui passe devant le chronomètre"]').exists()
    ).toBe(false)
    wrapper.unmount()
  })

  it('émet add-coureur au clic sur Coureur', async () => {
    const wrapper = mountChronometre({ status: 'idle', showAddCoureur: true })
    await wrapper
      .find('button[aria-label="Ajouter un coureur qui passe devant le chronomètre"]')
      .trigger('click')
    expect(wrapper.emitted('add-coureur')).toBeTruthy()
    wrapper.unmount()
  })
})
