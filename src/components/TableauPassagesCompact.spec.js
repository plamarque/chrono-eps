import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableauPassagesCompact from './TableauPassagesCompact.vue'

function mountTableauPassagesCompact(props = {}) {
  return mount(TableauPassagesCompact, {
    props: {
      participants: props.participants ?? [],
      participantStates: props.participantStates ?? {},
      passagesByParticipant: props.passagesByParticipant ?? {},
      status: props.status ?? 'idle',
      readOnly: props.readOnly ?? false,
      hideFinished: props.hideFinished ?? true
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

describe('TableauPassagesCompact', () => {
  it('affiche la grille de cartes avec les noms des participants', () => {
    const participants = [
      { id: '1', nom: 'Elève 1', color: '#ef4444' },
      { id: '2', nom: 'Elève 2', color: '#3b82f6' }
    ]
    const participantStates = {
      '1': { status: 'running' },
      '2': { status: 'running' }
    }
    const wrapper = mountTableauPassagesCompact({
      participants,
      participantStates,
      status: 'running'
    })
    expect(wrapper.find('.tableau-passages-compact-grid').exists()).toBe(true)
    const cards = wrapper.findAll('.tableau-passages-compact-card')
    expect(cards.length).toBe(2)
    expect(cards[0].text()).toContain('Elève 1')
    expect(cards[1].text()).toContain('Elève 2')
  })

  it('affiche le nom du participant sur la carte', () => {
    const participants = [{ id: '1', nom: 'Jean Dupont', color: '#ef4444' }]
    const participantStates = { '1': { status: 'running' } }
    const wrapper = mountTableauPassagesCompact({
      participants,
      participantStates,
      status: 'running'
    })
    const card = wrapper.find('.tableau-passages-compact-card')
    expect(card.text()).toContain('Jean Dupont')
  })

  it('émet record au clic sur le bouton passage', async () => {
    const participants = [{ id: '1', nom: 'Elève 1', color: '#ef4444' }]
    const participantStates = { '1': { elapsedMs: 1000, status: 'running' } }
    const wrapper = mountTableauPassagesCompact({
      participants,
      participantStates,
      status: 'running'
    })
    const passageBtn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Marquer passage')
    expect(passageBtn).toBeDefined()
    await passageBtn.trigger('click')
    expect(wrapper.emitted('record')).toBeTruthy()
    expect(wrapper.emitted('record')[0][0]).toBe('1')
  })

  it('masque les cartes des élèves stoppés quand hideFinished est true et chrono en cours', () => {
    const participants = [
      { id: '1', nom: 'Elève 1', color: '#ef4444' },
      { id: '2', nom: 'Elève 2', color: '#3b82f6' }
    ]
    const participantStates = {
      '1': { status: 'running' },
      '2': { status: 'paused' }
    }
    const wrapper = mountTableauPassagesCompact({
      participants,
      participantStates,
      status: 'running',
      hideFinished: true
    })
    const cards = wrapper.findAll('.tableau-passages-compact-card')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('Elève 1')
  })

  it('affiche toutes les cartes quand chrono global arrêté (status paused/idle) même si tous paused', () => {
    const participants = [
      { id: '1', nom: 'Elève 1', color: '#ef4444' },
      { id: '2', nom: 'Elève 2', color: '#3b82f6' }
    ]
    const participantStates = {
      '1': { status: 'paused' },
      '2': { status: 'paused' }
    }
    const wrapper = mountTableauPassagesCompact({
      participants,
      participantStates,
      status: 'paused',
      hideFinished: true
    })
    const cards = wrapper.findAll('.tableau-passages-compact-card')
    expect(cards.length).toBe(2)
  })

  it('affiche toutes les cartes quand hideFinished est false', () => {
    const participants = [
      { id: '1', nom: 'Elève 1', color: '#ef4444' },
      { id: '2', nom: 'Elève 2', color: '#3b82f6' }
    ]
    const participantStates = {
      '1': { status: 'running' },
      '2': { status: 'paused' }
    }
    const wrapper = mountTableauPassagesCompact({
      participants,
      participantStates,
      status: 'running',
      hideFinished: false
    })
    const cards = wrapper.findAll('.tableau-passages-compact-card')
    expect(cards.length).toBe(2)
  })

  it('readOnly affiche la grille et les temps sans cartes tappables', () => {
    const participants = [
      { id: '1', nom: 'Elève 1' },
      { id: '2', nom: 'Elève 2' }
    ]
    const passagesByParticipant = {
      '1': [{ tourNum: 1, lapMs: 45000, totalMs: 45000 }],
      '2': [{ tourNum: 1, lapMs: 50000, totalMs: 50000 }]
    }
    const wrapper = mountTableauPassagesCompact({
      participants,
      passagesByParticipant,
      readOnly: true
    })
    expect(wrapper.find('.tableau-passages-compact-card-tappable').exists()).toBe(false)
    expect(wrapper.find('.tableau-passages-compact-resume').exists()).toBe(true)
    expect(wrapper.text()).toContain('Temps')
    expect(wrapper.text()).toContain('Elève 1')
    expect(wrapper.text()).toContain('Elève 2')
    expect(wrapper.text()).toContain('00:45.00')
    expect(wrapper.text()).toContain('00:50.00')
  })

  it('readOnly affiche tous les participants dans la grille (hideFinished ignoré)', () => {
    const participants = [
      { id: '1', nom: 'Elève 1' },
      { id: '2', nom: 'Elève 2' }
    ]
    const wrapper = mountTableauPassagesCompact({
      participants,
      participantStates: {},
      readOnly: true,
      hideFinished: true
    })
    const cards = wrapper.findAll('.tableau-passages-compact-card')
    expect(cards.length).toBe(2)
  })

  it('affiche la section Temps avec P1, P2 pour chaque participant', () => {
    const participants = [
      { id: '1', nom: 'Elève 1' },
      { id: '2', nom: 'Elève 2' }
    ]
    const passagesByParticipant = {
      '1': [
        { tourNum: 1, lapMs: 40000, totalMs: 40000 },
        { tourNum: 2, lapMs: 35000, totalMs: 75000 }
      ],
      '2': [{ tourNum: 1, lapMs: 42000, totalMs: 42000 }]
    }
    const wrapper = mountTableauPassagesCompact({
      participants,
      passagesByParticipant
    })
    expect(wrapper.text()).toContain('Temps')
    expect(wrapper.text()).toContain('P1')
    expect(wrapper.text()).toContain('P2')
    expect(wrapper.text()).toContain('00:40.00')
    expect(wrapper.text()).toContain('00:35.00')
    expect(wrapper.text()).toContain('00:42.00')
    expect(wrapper.text()).toContain('01:15.00')
  })

  it('affiche le bouton Ajouter quand participants < 20', () => {
    const wrapper = mountTableauPassagesCompact({ participants: [] })
    expect(wrapper.text()).toContain('Ajouter')
  })

  it('émet add au clic sur Ajouter', async () => {
    const wrapper = mountTableauPassagesCompact({ participants: [] })
    const addBtn = wrapper.findAll('button').find((b) => b.text() === 'Ajouter')
    await addBtn?.trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
    expect(wrapper.emitted('add')[0][0].nom).toMatch(/^Elève \d+$/)
  })

  it('masque les boutons stop/start et passage en readOnly', () => {
    const participants = [{ id: '1', nom: 'Elève 1' }]
    const wrapper = mountTableauPassagesCompact({ participants, readOnly: true })
    expect(wrapper.find('.tableau-passages-compact-card-actions').exists()).toBe(false)
  })
})
