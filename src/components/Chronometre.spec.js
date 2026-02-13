import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Chronometre from './Chronometre.vue'

// Mount with stub for Button to avoid PrimeVue setup
function mountChronometre() {
  return mount(Chronometre, {
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
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche 00:00.00 à l\'état initial', () => {
    const wrapper = mountChronometre()
    expect(wrapper.find('[role="timer"]').text()).toBe('00:00.00')
    wrapper.unmount()
  })

  it('affiche le bouton Démarrer quand idle', () => {
    const wrapper = mountChronometre()
    const buttons = wrapper.findAll('button')
    const demarrer = buttons.find((b) => b.text() === 'Démarrer')
    expect(demarrer).toBeDefined()
    expect(demarrer.exists()).toBe(true)
    wrapper.unmount()
  })

  it('affiche Tour et Arrêter après avoir cliqué Démarrer', async () => {
    const wrapper = mountChronometre()
    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    expect(buttons.some((b) => b.text() === 'Tour')).toBe(true)
    expect(buttons.some((b) => b.text() === 'Arrêter')).toBe(true)
    expect(buttons.some((b) => b.text() === 'Démarrer')).toBe(false)
    wrapper.unmount()
  })

  it('enregistre un passage au clic sur Tour', async () => {
    const wrapper = mountChronometre()
    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await wrapper.vm.$nextTick()

    await vi.advanceTimersByTimeAsync(100)
    const tour = wrapper.findAll('button').find((b) => b.text() === 'Tour')
    await tour.trigger('click')
    await wrapper.vm.$nextTick()

    const passages = wrapper.find('.chronometre-passages')
    expect(passages.exists()).toBe(true)
    expect(passages.text()).toContain('Tour 1')
    wrapper.unmount()
  })

  it('enregistre plusieurs passages', async () => {
    const wrapper = mountChronometre()
    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await wrapper.vm.$nextTick()

    const tourBtn = () => wrapper.findAll('button').find((b) => b.text() === 'Tour')
    await tourBtn().trigger('click')
    await wrapper.vm.$nextTick()
    await tourBtn().trigger('click')
    await wrapper.vm.$nextTick()

    const passages = wrapper.find('.chronometre-passages')
    expect(passages.text()).toContain('Tour 1')
    expect(passages.text()).toContain('Tour 2')
    wrapper.unmount()
  })

  it('affiche Réinitialiser après Arrêter', async () => {
    const wrapper = mountChronometre()
    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await wrapper.vm.$nextTick()
    const arreter = wrapper.findAll('button').find((b) => b.text() === 'Arrêter')
    await arreter.trigger('click')
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    expect(buttons.some((b) => b.text() === 'Réinitialiser')).toBe(true)
    wrapper.unmount()
  })

  it('efface les passages et revient à l\'état initial au Reset', async () => {
    const wrapper = mountChronometre()
    const demarrer = wrapper.findAll('button').find((b) => b.text() === 'Démarrer')
    await demarrer.trigger('click')
    await wrapper.vm.$nextTick()
    const tour = wrapper.findAll('button').find((b) => b.text() === 'Tour')
    await tour.trigger('click')
    await wrapper.vm.$nextTick()
    const arreter = wrapper.findAll('button').find((b) => b.text() === 'Arrêter')
    await arreter.trigger('click')
    await wrapper.vm.$nextTick()
    const reset = wrapper.findAll('button').find((b) => b.text() === 'Réinitialiser')
    await reset.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="timer"]').text()).toBe('00:00.00')
    expect(wrapper.find('.chronometre-passages').exists()).toBe(false)
    const buttons = wrapper.findAll('button')
    expect(buttons.some((b) => b.text() === 'Démarrer')).toBe(true)
    wrapper.unmount()
  })
})
