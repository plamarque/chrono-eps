import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Chronometre from './Chronometre.vue'

function mountChronometre(props = {}) {
  return mount(Chronometre, {
    props: {
      elapsedMs: props.elapsedMs ?? 0,
      status: props.status ?? 'idle',
      showTour: props.showTour ?? false,
      isViewingLoadedCourse: props.isViewingLoadedCourse ?? false
    },
    global: {
      stubs: {
        Button: {
          template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>',
          inheritAttrs: true
        }
      }
    }
  })
}

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

  it('affiche Réinitialiser quand status est paused', () => {
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

  it('affiche Nouvelle course et masque Démarrer quand isViewingLoadedCourse', () => {
    const wrapper = mountChronometre({ status: 'idle', isViewingLoadedCourse: true })
    const buttons = wrapper.findAll('button')
    expect(buttons.some((b) => b.text() === 'Nouvelle course')).toBe(true)
    expect(buttons.some((b) => b.text() === 'Démarrer')).toBe(false)
    wrapper.unmount()
  })

  it('émet reset au clic sur Nouvelle course', async () => {
    const wrapper = mountChronometre({ status: 'idle', isViewingLoadedCourse: true })
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Nouvelle course')
    await btn.trigger('click')
    expect(wrapper.emitted('reset')).toBeTruthy()
    wrapper.unmount()
  })
})
