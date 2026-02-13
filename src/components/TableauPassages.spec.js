import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableauPassages from './TableauPassages.vue'

function mountTableauPassages(props = {}) {
  return mount(TableauPassages, {
    props: {
      participants: props.participants ?? [],
      participantStates: props.participantStates ?? {},
      passagesByParticipant: props.passagesByParticipant ?? {},
      status: props.status ?? 'idle'
    },
    global: {
      stubs: {
        Dialog: {
          template: '<div v-if="visible"><slot></slot><slot name="footer"></slot></div>',
          props: ['visible']
        }
      }
    }
  })
}

describe('TableauPassages', () => {
  it('affiche le bouton Ajouter et le mode chrono seul quand aucun participant', () => {
    const wrapper = mountTableauPassages({ participants: [] })
    expect(wrapper.find('.tableau-passages').exists()).toBe(true)
    expect(wrapper.text()).toContain('Ajouter')
    expect(wrapper.text()).toContain('Mode chrono seul')
    wrapper.unmount()
  })

  it('émet add au clic sur Ajouter', async () => {
    const wrapper = mountTableauPassages({ participants: [] })
    const addBtn = wrapper.findAll('button').find((b) => b.text() === 'Ajouter')
    await addBtn.trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
    expect(wrapper.emitted('add')[0][0]).toHaveProperty('id')
    expect(wrapper.emitted('add')[0][0].nom).toMatch(/^Elève \d+$/)
    wrapper.unmount()
  })

  it('affiche les participants en colonnes', () => {
    const participants = [
      { id: '1', nom: 'Alice' },
      { id: '2', nom: 'Bob' }
    ]
    const wrapper = mountTableauPassages({ participants })
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
    wrapper.unmount()
  })

  it('affiche les passages avec durée tour et temps total', () => {
    const participants = [{ id: '1', nom: 'Alice' }]
    const passagesByParticipant = {
      '1': [{ tourNum: 1, lapMs: 45000, totalMs: 45000 }]
    }
    const wrapper = mountTableauPassages({
      participants,
      passagesByParticipant
    })
    expect(wrapper.text()).toContain('00:45.00')
    wrapper.unmount()
  })

  it('émet record au clic sur une cellule tappable', async () => {
    const participants = [{ id: '1', nom: 'Alice' }]
    const participantStates = { '1': { elapsedMs: 1000, status: 'running' } }
    const wrapper = mountTableauPassages({
      participants,
      participantStates,
      status: 'running'
    })
    const tappableCell = wrapper.find('.tableau-passages-tappable')
    await tappableCell.trigger('click')
    expect(wrapper.emitted('record')).toBeTruthy()
    expect(wrapper.emitted('record')[0][0]).toBe('1')
    wrapper.unmount()
  })
})
