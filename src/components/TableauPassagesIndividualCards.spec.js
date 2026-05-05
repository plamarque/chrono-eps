import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmationService from 'primevue/confirmationservice'
import TableauPassagesIndividualCards from './TableauPassagesIndividualCards.vue'

function mountCards(props = {}) {
  return mount(TableauPassagesIndividualCards, {
    props: {
      participants: props.participants ?? [{ id: 'c1', nom: 'Coureur 1', color: '#ef4444' }],
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
        InputText: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :id="$attrs.id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          inheritAttrs: true
        }
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

  it('n’ouvre pas la modale depuis le corps de carte (uniquement via l’en-tête)', async () => {
    const wrapper = mountCards({
      participantStates: {
        c1: { status: 'paused', elapsedMs: 12000 }
      },
      status: 'paused'
    })

    await wrapper.find('.indiv-body').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="participant-dialog-shell"]').exists()).toBe(false)

    await wrapper.find('.indiv-header').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="participant-dialog-shell"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('émet update avec nom trimmé et couleur puis ferme la modale', async () => {
    const wrapper = mountCards({
      participantStates: {
        c1: { status: 'paused', elapsedMs: 12000 }
      },
      status: 'paused'
    })

    await wrapper.find('.indiv-header').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('#participant-nom-modal-indiv').setValue('  Nouveau nom  ')
    await wrapper.find('.participant-modal-color-btn[aria-label="Couleur #3b82f6"]').trigger('click')
    const saveBtn = wrapper.findAll('button').find((b) => b.text() === 'Enregistrer')
    await saveBtn.trigger('click')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')[0][0]).toMatchObject({
      id: 'c1',
      nom: 'Nouveau nom',
      color: '#3b82f6'
    })
    expect(wrapper.find('[data-testid="participant-dialog-shell"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('n’émet pas update quand le nom est vide après trim', async () => {
    const wrapper = mountCards({
      participantStates: {
        c1: { status: 'paused', elapsedMs: 12000 }
      },
      status: 'paused'
    })

    await wrapper.find('.indiv-header').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('#participant-nom-modal-indiv').setValue('   ')
    const saveBtn = wrapper.findAll('button').find((b) => b.text() === 'Enregistrer')
    await saveBtn.trigger('click')

    expect(wrapper.emitted('update')).toBeFalsy()
    expect(wrapper.find('[data-testid="participant-dialog-shell"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('readOnly + allowParticipantEdit autorise l’ouverture de la modale', async () => {
    const wrapper = mountCards({
      readOnly: true,
      allowParticipantEdit: true,
      participantStates: {
        c1: { status: 'running', elapsedMs: 10000 }
      },
      status: 'running'
    })

    expect(wrapper.find('.indiv-header-clickable').exists()).toBe(true)
    await wrapper.find('.indiv-header').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="participant-dialog-shell"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('avec deux coureurs, seul celui en pause est éditable', async () => {
    const wrapper = mountCards({
      participants: [
        { id: 'c1', nom: 'Coureur 1', color: '#ef4444' },
        { id: 'c2', nom: 'Coureur 2', color: '#3b82f6' }
      ],
      participantStates: {
        c1: { status: 'running', elapsedMs: 12000 },
        c2: { status: 'paused', elapsedMs: 11000 }
      },
      status: 'running'
    })

    expect(wrapper.findAll('.indiv-header-clickable').length).toBe(1)

    const headers = wrapper.findAll('.indiv-header')
    await headers[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="participant-dialog-shell"]').exists()).toBe(false)

    await headers[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="participant-dialog-shell"]').exists()).toBe(true)

    wrapper.unmount()
  })
})
