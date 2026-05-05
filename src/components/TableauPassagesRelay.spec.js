import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import { COULEURS_PALETTE } from '../models/participant.js'
import TableauPassagesRelay from './TableauPassagesRelay.vue'
import RelayGroupModal from './RelayGroupModal.vue'

function mountTableauPassagesRelay(props = {}) {
  return mount(TableauPassagesRelay, {
    props: {
      participants: props.participants ?? [],
      participantStates: props.participantStates ?? {},
      passagesByParticipant: props.passagesByParticipant ?? {},
      groupRunners: props.groupRunners ?? {},
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
  it('affiche la section Temps avec temps groupe et lignes par coureur', () => {
    const participants = [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }]
    const groupRunners = {
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
      groupRunners,
      passagesByParticipant
    })
    expect(wrapper.find('.tableau-passages-resume').exists()).toBe(true)
    expect(wrapper.text()).toContain('Temps')
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

  it('affiche le Total cumulé par coureur (somme de ses laps)', () => {
    const participants = [{ id: 'g1', nom: 'Groupe 1', color: '#3b82f6' }]
    const groupRunners = {
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
      groupRunners,
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
    const groupRunners = Object.fromEntries(participants.map((p) => [p.id, []]))
    const wrapper = mountTableauPassagesRelay({ participants, groupRunners })
    expect(wrapper.find('button[aria-label="Ajouter"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('émet un groupe nommé Groupe 7 avec couleur réutilisée quand on ajoute au-delà de 6 groupes', async () => {
    const participants = Array.from({ length: 6 }, (_, i) => ({
      id: `g${i + 1}`,
      nom: `Groupe ${i + 1}`,
      color: COULEURS_PALETTE[i]
    }))
    const groupRunners = Object.fromEntries(participants.map((p) => [p.id, []]))
    const wrapper = mountTableauPassagesRelay({ participants, groupRunners })
    const addBtn = wrapper.find('button[aria-label="Ajouter"]')
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
    const groupRunners = Object.fromEntries(participants.map((p) => [p.id, []]))
    const wrapper = mountTableauPassagesRelay({ participants, groupRunners })
    const addBtn = wrapper.find('button[aria-label="Ajouter"]')
    expect(addBtn.exists()).toBe(true)
    await addBtn.trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
    const [group] = wrapper.emitted('add')[0]
    expect(group.nom).toBe('Groupe 8')
    wrapper.unmount()
  })

  it('passe hasPassages au RelayGroupModal : boutons suppr. masqués quand le groupe a des passages', async () => {
    const participants = [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }]
    const groupRunners = {
      g1: [
        { nom: 'Alice', ordre: 0 },
        { nom: 'Bob', ordre: 1 }
      ]
    }
    const passagesByParticipant = {
      g1: [{ tourNum: 1, lapMs: 30000, totalMs: 30000, studentIndex: 0 }]
    }
    const wrapper = mount(TableauPassagesRelay, {
      props: {
        participants,
        groupRunners,
        passagesByParticipant,
        status: 'idle',
        readOnly: false
      },
      global: {
        plugins: [PrimeVue, ConfirmationService],
        stubs: {
          Dialog: {
            template: '<div v-if="visible"><slot></slot><slot name="footer"></slot></div>',
            props: ['visible']
          }
        }
      }
    })
    const body = wrapper.find('.tableau-relay-body-clickable')
    await body.trigger('click')
    await wrapper.vm.$nextTick()
    const modal = wrapper.findComponent(RelayGroupModal)
    expect(modal.exists()).toBe(true)
    expect(modal.props('hasPassages')).toBe(true)
    const deleteBtns = wrapper.findAll('.relay-group-remove-btn')
    expect(deleteBtns).toHaveLength(0)
    wrapper.unmount()
  })

  it('passe hasPassages au RelayGroupModal : boutons suppr. visibles quand le groupe n\'a pas de passages', async () => {
    const participants = [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }]
    const groupRunners = {
      g1: [
        { nom: 'Alice', ordre: 0 },
        { nom: 'Bob', ordre: 1 }
      ]
    }
    const wrapper = mount(TableauPassagesRelay, {
      props: {
        participants,
        groupRunners,
        passagesByParticipant: {},
        status: 'idle',
        readOnly: false
      },
      global: {
        plugins: [PrimeVue, ConfirmationService],
        stubs: {
          Dialog: {
            template: '<div v-if="visible"><slot></slot><slot name="footer"></slot></div>',
            props: ['visible']
          }
        }
      }
    })
    const body = wrapper.find('.tableau-relay-body-clickable')
    await body.trigger('click')
    await wrapper.vm.$nextTick()
    const modal = wrapper.findComponent(RelayGroupModal)
    expect(modal.exists()).toBe(true)
    expect(modal.props('hasPassages')).toBe(false)
    const deleteBtns = wrapper.findAll('.relay-group-remove-btn')
    expect(deleteBtns.length).toBeGreaterThanOrEqual(1)
    wrapper.unmount()
  })

  it('ne ouvre pas la config groupe tant que le groupe est en course', async () => {
    const participants = [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }]
    const groupRunners = {
      g1: [{ nom: 'Alice', ordre: 0 }]
    }
    const wrapper = mount(TableauPassagesRelay, {
      props: {
        participants,
        groupRunners,
        passagesByParticipant: {},
        participantStates: {
          g1: { status: 'running', elapsedMs: 500, elapsedBeforePause: 0, startTime: 0 }
        },
        status: 'running',
        readOnly: false
      },
      global: {
        plugins: [PrimeVue, ConfirmationService],
        stubs: {
          Dialog: {
            template: '<div v-if="visible"><slot></slot><slot name="footer"></slot></div>',
            props: ['visible']
          }
        }
      }
    })
    expect(wrapper.find('.tableau-relay-header-clickable').exists()).toBe(false)
    await wrapper.find('.tableau-relay-header').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(RelayGroupModal).props('visible')).toBe(false)
    wrapper.unmount()
  })

  it('affiche des fallbacks sûrs pour des noms relay legacy invalides', () => {
    const participants = [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }]
    const groupRunners = {
      g1: [
        { nom: 'Coureur NaN', ordre: 0 },
        { nom: 'coureur nan', ordre: 1 }
      ]
    }
    const passagesByParticipant = {
      g1: [
        { tourNum: 1, lapMs: 15000, totalMs: 15000, studentIndex: 0 },
        { tourNum: 2, lapMs: 17000, totalMs: 32000, studentIndex: 1 }
      ]
    }
    const wrapper = mountTableauPassagesRelay({
      participants,
      groupRunners,
      passagesByParticipant,
      participantStates: {
        g1: { status: 'paused', elapsedMs: 32000, elapsedBeforePause: 32000, startTime: null }
      }
    })
    expect(wrapper.text()).not.toContain('NaN')
    expect(wrapper.text()).toContain('Coureur 1')
    expect(wrapper.text()).toContain('Coureur 2')
    wrapper.unmount()
  })
})
