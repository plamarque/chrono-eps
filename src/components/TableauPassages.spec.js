import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableauPassages from './TableauPassages.vue'

function mountTableauPassages(props = {}) {
  return mount(TableauPassages, {
    props: {
      participants: props.participants ?? [],
      participantStates: props.participantStates ?? {},
      passagesByParticipant: props.passagesByParticipant ?? {},
      status: props.status ?? 'idle',
      readOnly: props.readOnly ?? false
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
  it('affiche le bouton Ajouter quand aucun participant', () => {
    const wrapper = mountTableauPassages({ participants: [] })
    expect(wrapper.find('.tableau-passages').exists()).toBe(true)
    expect(wrapper.text()).toContain('Ajouter')
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

  it('affiche les temps en direct dans une cellule tappable', () => {
    const participants = [{ id: '1', nom: 'Alice' }]
    const participantStates = { '1': { elapsedMs: 45000, status: 'running' } }
    const wrapper = mountTableauPassages({
      participants,
      participantStates,
      status: 'running'
    })
    const tappableCell = wrapper.find('.tableau-passages-tappable')
    expect(tappableCell.exists()).toBe(true)
    expect(tappableCell.find('.tableau-passages-tappable-cell').exists()).toBe(true)
    // Tour en cours: 45s, Total: 45s (aucun passage précédent)
    expect(tappableCell.text()).toContain('00:45.00')
    expect(tappableCell.text()).toContain('Tour:')
    expect(tappableCell.text()).toContain('Total:')
    wrapper.unmount()
  })

  it('affiche le temps du tour en cours (depuis dernier passage) dans une cellule tappable', () => {
    const participants = [{ id: '1', nom: 'Alice' }]
    const participantStates = { '1': { elapsedMs: 75000, status: 'running' } }
    const passagesByParticipant = {
      '1': [{ tourNum: 1, lapMs: 40000, totalMs: 40000 }]
    }
    const wrapper = mountTableauPassages({
      participants,
      participantStates,
      passagesByParticipant,
      status: 'running'
    })
    const tappableCell = wrapper.find('.tableau-passages-tappable')
    expect(tappableCell.exists()).toBe(true)
    // Tour en cours: 75 - 40 = 35s, Total: 75s
    expect(tappableCell.text()).toContain('00:35.00') // lap
    expect(tappableCell.text()).toContain('01:15.00') // total
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

  it('affiche le bloc performances quand des participants ont des passages', () => {
    const participants = [
      { id: '1', nom: 'Alice' },
      { id: '2', nom: 'Bob' }
    ]
    const passagesByParticipant = {
      '1': [
        { tourNum: 1, lapMs: 30000, totalMs: 30000 },
        { tourNum: 2, lapMs: 28000, totalMs: 58000 }
      ],
      '2': [{ tourNum: 1, lapMs: 32000, totalMs: 32000 }]
    }
    const wrapper = mountTableauPassages({
      participants,
      passagesByParticipant
    })
    expect(wrapper.find('.tableau-passages-resume').exists()).toBe(true)
    expect(wrapper.text()).toContain('Performances')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('2 tours')
    expect(wrapper.text()).toContain('1 tour')
    expect(wrapper.text()).toContain('00:58.00')
    expect(wrapper.text()).toContain('00:32.00')
    wrapper.unmount()
  })

  it('masque le bloc performances en mode solo', () => {
    const passagesByParticipant = {
      __solo__: [{ tourNum: 1, lapMs: 45000, totalMs: 45000 }]
    }
    const wrapper = mountTableauPassages({
      participants: [],
      passagesByParticipant
    })
    expect(wrapper.find('.tableau-passages-resume').exists()).toBe(false)
    wrapper.unmount()
  })

  it('affiche plusieurs participants avec passages multiples', () => {
    const participants = [
      { id: '1', nom: 'Alice' },
      { id: '2', nom: 'Bob' },
      { id: '3', nom: 'Charlie' }
    ]
    const passagesByParticipant = {
      '1': [
        { tourNum: 1, lapMs: 40000, totalMs: 40000 },
        { tourNum: 2, lapMs: 35000, totalMs: 75000 }
      ],
      '2': [{ tourNum: 1, lapMs: 42000, totalMs: 42000 }],
      '3': []
    }
    const wrapper = mountTableauPassages({
      participants,
      passagesByParticipant
    })
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('Charlie')
    expect(wrapper.text()).toContain('00:40.00')
    expect(wrapper.text()).toContain('00:35.00')
    expect(wrapper.text()).toContain('00:42.00')
    expect(wrapper.text()).toContain('01:15.00')
    wrapper.unmount()
  })

  it('readOnly masque le bouton Ajouter', () => {
    const wrapper = mountTableauPassages({ participants: [], readOnly: true })
    expect(wrapper.text()).not.toContain('Ajouter')
    wrapper.unmount()
  })

  it('readOnly masque la ligne des contrôles démarrer/arrêter', () => {
    const participants = [{ id: '1', nom: 'Alice' }]
    const wrapper = mountTableauPassages({ participants, readOnly: true })
    expect(wrapper.find('.tableau-passages-controls-row').exists()).toBe(false)
    wrapper.unmount()
  })

  it('readOnly désactive le tap sur les cellules (pas de record)', () => {
    const participants = [{ id: '1', nom: 'Alice' }]
    const participantStates = { '1': { status: 'running' } }
    const wrapper = mountTableauPassages({
      participants,
      participantStates,
      status: 'running',
      readOnly: true
    })
    const tappable = wrapper.find('.tableau-passages-tappable')
    expect(tappable.exists()).toBe(false)
    wrapper.unmount()
  })

  it('masque le participant supprimé quand props participants et passages sont mis à jour', async () => {
    const participants = [
      { id: '1', nom: 'Alice' },
      { id: '2', nom: 'Bob' }
    ]
    const passagesByParticipant = {
      '1': [{ tourNum: 1, lapMs: 30000, totalMs: 30000 }],
      '2': [{ tourNum: 1, lapMs: 32000, totalMs: 32000 }]
    }
    const wrapper = mountTableauPassages({
      participants,
      passagesByParticipant
    })
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')

    await wrapper.setProps({
      participants: [{ id: '1', nom: 'Alice' }],
      passagesByParticipant: {
        '1': [{ tourNum: 1, lapMs: 30000, totalMs: 30000 }]
      }
    })

    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).not.toContain('Bob')
    expect(wrapper.text()).not.toContain('00:32.00')
    wrapper.unmount()
  })

  it('émet remove quand on supprime un participant dans le modal', async () => {
    const participants = [{ id: '1', nom: 'Alice' }]
    const passagesByParticipant = {
      '1': [{ tourNum: 1, lapMs: 45000, totalMs: 45000 }]
    }
    const wrapper = mount(TableauPassages, {
      props: {
        participants,
        passagesByParticipant
      },
      global: {
        stubs: {
          Dialog: {
            template: '<div v-if="visible"><slot name="footer"></slot></div>',
            props: ['visible']
          }
        }
      }
    })
    await wrapper.find('.tableau-passages-th-clickable').trigger('click')
    await wrapper.vm.$nextTick()
    const deleteBtn = wrapper.findAll('button').find((b) => b.text().includes('Supprimer'))
    await deleteBtn?.trigger('click')
    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')[0][0]).toMatchObject({ id: '1', nom: 'Alice' })
    wrapper.unmount()
  })
})
