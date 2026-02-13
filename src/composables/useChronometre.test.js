import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { useChronometre } from './useChronometre.js'

const TestWrapper = defineComponent({
  setup() {
    const participants = ref([{ id: 'p1', nom: 'P1' }])
    const chrono = useChronometre(participants)
    return () =>
      h('div', [
        h('span', { class: 'timer' }, chrono.elapsedMs.value.toString()),
        h('span', { class: 'status' }, chrono.status.value),
        h('span', {
          class: 'passages',
          'data-testid': 'passages'
        }, JSON.stringify(chrono.passagesByParticipant.value)),
        h('button', { onClick: chrono.start }, 'Start'),
        h('button', { onClick: chrono.stop }, 'Stop'),
        h('button', { onClick: chrono.reset }, 'Reset'),
        h('button', { onClick: () => chrono.recordPassage('p1') }, 'Record')
      ])
  }
})

describe('useChronometre', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initialise avec status idle et elapsedMs à 0', () => {
    const wrapper = mount(TestWrapper)
    expect(wrapper.find('.status').text()).toBe('idle')
    expect(wrapper.find('.timer').text()).toBe('0')
    wrapper.unmount()
  })

  it('passe à running au start et elapsedMs avance', async () => {
    const wrapper = mount(TestWrapper)
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.find('.status').text()).toBe('running')
    await vi.advanceTimersByTimeAsync(100)
    expect(Number(wrapper.find('.timer').text())).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('passe à paused au stop', async () => {
    const wrapper = mount(TestWrapper)
    await wrapper.findAll('button')[0].trigger('click')
    await vi.advanceTimersByTimeAsync(50)
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.find('.status').text()).toBe('paused')
    wrapper.unmount()
  })

  it('revient à idle et elapsedMs à 0 au reset', async () => {
    const wrapper = mount(TestWrapper)
    await wrapper.findAll('button')[0].trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await wrapper.findAll('button')[1].trigger('click')
    await wrapper.findAll('button')[2].trigger('click')
    expect(wrapper.find('.status').text()).toBe('idle')
    expect(wrapper.find('.timer').text()).toBe('0')
    wrapper.unmount()
  })

  it('enregistre un passage par participant', async () => {
    const wrapper = mount(TestWrapper)
    await wrapper.findAll('button')[0].trigger('click')
    await vi.advanceTimersByTimeAsync(5000)
    await wrapper.findAll('button')[3].trigger('click')
    await wrapper.vm.$nextTick()
    const passages = JSON.parse(wrapper.find('[data-testid="passages"]').text())
    expect(passages.p1).toHaveLength(1)
    expect(passages.p1[0]).toMatchObject({
      tourNum: 1,
      lapMs: expect.any(Number),
      totalMs: expect.any(Number)
    })
    wrapper.unmount()
  })
})
