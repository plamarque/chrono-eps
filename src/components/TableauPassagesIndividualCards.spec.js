import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmationService from 'primevue/confirmationservice'
import TableauPassagesIndividualCards from './TableauPassagesIndividualCards.vue'

function mountCards(props = {}) {
  return mount(TableauPassagesIndividualCards, {
    props: {
      participants: [{ id: 'c1', nom: 'Coureur 1', color: '#ef4444' }],
      participantStates: props.participantStates ?? {
        c1: { status: 'running', elapsedMs: 45000 }
      },
      passagesByParticipant: props.passagesByParticipant ?? {},
      participantJoinBaseline: props.participantJoinBaseline ?? {},
      status: props.status ?? 'running',
      readOnly: props.readOnly ?? false,
      allowParticipantEdit: props.allowParticipantEdit ?? false
    },
    global: {
      plugins: [ConfirmationService],
      stubs: {
        Button: {
          props: ['label', 'icon', 'severity'],
          template:
            '<button type="button" :aria-label="$attrs[\'aria-label\']" @click="$emit(\'click\')">{{ label }}</button>',
          inheritAttrs: true
        },
        Dialog: {
          props: ['visible'],
          template:
            '<div v-if="visible" data-testid="participant-dialog-shell"><slot /><slot name="footer" /></div>'
        },
        InputText: true
      }
    }
  })
}

describe('TableauPassagesIndividualCards', () => {
  it('affiche le Temps qui défile avant le premier drapeau', () => {
    const wrapper = mountCards()

    expect(wrapper.text()).toContain('Temps')
    expect(wrapper.text()).toContain('00:45.00')
    expect(wrapper.text()).not.toContain('Tour en cours')
    expect(wrapper.text()).not.toContain('Tour 1 :')

    wrapper.unmount()
  })

  it('après un drapeau, garde le Temps figé et affiche le prochain tour près du drapeau', () => {
    const wrapper = mountCards({
      participantStates: {
        c1: { status: 'running', elapsedMs: 75000 }
      },
      passagesByParticipant: {
        c1: [{ tourNum: 1, lapMs: 45000, totalMs: 45000, source: 'flag' }]
      }
    })

    expect(wrapper.text()).toContain('Temps')
    expect(wrapper.text()).not.toContain('Tour 2 en cours')
    expect(wrapper.text()).toContain('00:45.00')
    expect(wrapper.text()).toContain('Tour 2 :')
    expect(wrapper.text()).toContain('00:30.00')
    expect(wrapper.text()).toContain('Tour 1 :')

    wrapper.unmount()
  })

  it('masque les détails de tours quand seul un passage implicite Coureur existe', () => {
    const wrapper = mountCards({
      participantStates: {
        c1: { status: 'running', elapsedMs: 75000 }
      },
      passagesByParticipant: {
        c1: [{ tourNum: 1, lapMs: 45000, totalMs: 45000, source: 'coureur' }]
      }
    })

    expect(wrapper.text()).toContain('Temps')
    expect(wrapper.text()).toContain('00:45.00')
    expect(wrapper.text()).not.toContain('Tour 1 :')
    expect(wrapper.text()).not.toContain('Tour 2 :')

    wrapper.unmount()
  })

  it('masque les détails de tours quand seul un passage Stop existe', () => {
    const wrapper = mountCards({
      participantStates: {
        c1: { status: 'paused', elapsedMs: 75000 }
      },
      passagesByParticipant: {
        c1: [{ tourNum: 1, lapMs: 75000, totalMs: 75000, source: 'stop' }]
      }
    })

    expect(wrapper.text()).toContain('Temps')
    expect(wrapper.text()).toContain('01:15.00')
    expect(wrapper.text()).not.toContain('Tour 1 :')
    expect(wrapper.text()).not.toContain('Tour 2 :')

    wrapper.unmount()
  })

  it('ne permet pas d’ouvrir la modale depuis l’en-tête tant que le coureur est en course', async () => {
    const wrapper = mountCards({
      participantStates: {
        c1: { status: 'running', elapsedMs: 10000 }
      },
      status: 'running'
    })

    expect(wrapper.find('.indiv-header-clickable').exists()).toBe(false)
    await wrapper.find('.indiv-header').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="participant-dialog-shell"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('ouvre la modale depuis l’en-tête quand le coureur est en pause', async () => {
    const wrapper = mountCards({
      participantStates: {
        c1: { status: 'paused', elapsedMs: 10000 }
      },
      status: 'paused'
    })

    expect(wrapper.find('.indiv-header-clickable').exists()).toBe(true)
    await wrapper.find('.indiv-header').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="participant-dialog-shell"]').exists()).toBe(true)

    wrapper.unmount()
  })
})
