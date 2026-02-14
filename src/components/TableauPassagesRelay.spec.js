import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { COULEURS_PALETTE } from '../models/participant.js'
import TableauPassagesRelay from './TableauPassagesRelay.vue'

function mountTableauPassagesRelay(props = {}) {
  return mount(TableauPassagesRelay, {
    props: {
      participants: props.participants ?? [],
      participantStates: props.participantStates ?? {},
      passagesByParticipant: props.passagesByParticipant ?? {},
      groupStudents: props.groupStudents ?? {},
      status: props.status ?? 'idle',
      readOnly: props.readOnly ?? false
    },
    global: {
      stubs: {
        RelayGroupModal: {
          template: '<div v-if="visible"><slot></slot></div>',
          props: ['visible']
        }
      }
    }
  })
}

describe('TableauPassagesRelay', () => {
  it('affiche la section Performances avec temps groupe et lignes par élève', () => {
    const participants = [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }]
    const groupStudents = {
      g1: [
        { nom: 'Alice', ordre: 0 },
        { nom: 'Bob', ordre: 1 },
        { nom: 'Claire', ordre: 2 }
      ]
    }
    const passagesByParticipant = {
      g1: [
        { tourNum: 1, lapMs: 30000, totalMs: 30000, studentIndex: 0 },
        { tourNum: 2, lapMs: 28000, totalMs: 58000, studentIndex: 1 },
        { tourNum: 3, lapMs: 27000, totalMs: 85000, studentIndex: 2 },
        { tourNum: 4, lapMs: 29000, totalMs: 114000, studentIndex: 0 }
      ]
    }
    const wrapper = mountTableauPassagesRelay({
      participants,
      groupStudents,
      passagesByParticipant
    })
    expect(wrapper.find('.tableau-passages-resume').exists()).toBe(true)
    expect(wrapper.text()).toContain('Performances')
    expect(wrapper.text()).toContain('Groupe 1')
    expect(wrapper.text()).toContain('Total : 01:54.00')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('Claire')
    expect(wrapper.text()).toContain('P1')
    expect(wrapper.text()).toContain('P2')
    expect(wrapper.text()).toContain('00:30.00')
    expect(wrapper.text()).toContain('00:28.00')
    expect(wrapper.text()).toContain('00:29.00')
    expect(wrapper.text()).toContain('Total :')
    wrapper.unmount()
  })

  it('affiche le Total cumulé par élève (somme de ses laps)', () => {
    const participants = [{ id: 'g1', nom: 'Groupe 1', color: '#3b82f6' }]
    const groupStudents = {
      g1: [{ nom: 'Alice', ordre: 0 }, { nom: 'Bob', ordre: 1 }]
    }
    const passagesByParticipant = {
      g1: [
        { tourNum: 1, lapMs: 8670, totalMs: 8670, studentIndex: 0 },
        { tourNum: 2, lapMs: 2010, totalMs: 10680, studentIndex: 1 },
        { tourNum: 3, lapMs: 530, totalMs: 11210, studentIndex: 0 }
      ]
    }
    const wrapper = mountTableauPassagesRelay({
      participants,
      groupStudents,
      passagesByParticipant
    })
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('P1')
    expect(wrapper.text()).toContain('P2')
    expect(wrapper.text()).toContain('00:08.67')
    expect(wrapper.text()).toContain('00:02.01')
    expect(wrapper.text()).toContain('Total : 00:09.20')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('00:02.01')
    expect(wrapper.text()).toContain('Total : 00:02.01')
    wrapper.unmount()
  })

  it('masque le bouton Ajouter un groupe à 8 groupes', () => {
    const participants = Array.from({ length: 8 }, (_, i) => ({
      id: `g${i + 1}`,
      nom: `Groupe ${i + 1}`,
      color: COULEURS_PALETTE[i % COULEURS_PALETTE.length]
    }))
    const groupStudents = Object.fromEntries(participants.map((p) => [p.id, []]))
    const wrapper = mountTableauPassagesRelay({ participants, groupStudents })
    expect(wrapper.find('button[aria-label="Ajouter un groupe"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('émet un groupe nommé Groupe 7 avec couleur réutilisée quand on ajoute au-delà de 6 groupes', async () => {
    const participants = Array.from({ length: 6 }, (_, i) => ({
      id: `g${i + 1}`,
      nom: `Groupe ${i + 1}`,
      color: COULEURS_PALETTE[i]
    }))
    const groupStudents = Object.fromEntries(participants.map((p) => [p.id, []]))
    const wrapper = mountTableauPassagesRelay({ participants, groupStudents })
    const addBtn = wrapper.find('button[aria-label="Ajouter un groupe"]')
    expect(addBtn.exists()).toBe(true)
    await addBtn.trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
    const [group] = wrapper.emitted('add')[0]
    expect(group.nom).toBe('Groupe 7')
    expect(COULEURS_PALETTE).toContain(group.color)
    wrapper.unmount()
  })

  it('émet un groupe nommé Groupe 8 quand on ajoute le 8e groupe', async () => {
    const participants = Array.from({ length: 7 }, (_, i) => ({
      id: `g${i + 1}`,
      nom: `Groupe ${i + 1}`,
      color: COULEURS_PALETTE[i % COULEURS_PALETTE.length]
    }))
    const groupStudents = Object.fromEntries(participants.map((p) => [p.id, []]))
    const wrapper = mountTableauPassagesRelay({ participants, groupStudents })
    const addBtn = wrapper.find('button[aria-label="Ajouter un groupe"]')
    expect(addBtn.exists()).toBe(true)
    await addBtn.trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
    const [group] = wrapper.emitted('add')[0]
    expect(group.nom).toBe('Groupe 8')
    wrapper.unmount()
  })
})
