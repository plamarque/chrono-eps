import { describe, it, expect, vi } from 'vitest'

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: (options) => {
      options.accept?.()
    }
  })
}))

import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import RelayGroupModal from './RelayGroupModal.vue'

function mountRelayGroupModal(props = {}) {
  return mount(RelayGroupModal, {
    props: {
      visible: props.visible ?? true,
      group: props.group ?? { id: 'g1', nom: 'Groupe 1', color: '#ef4444' },
      runners: props.runners ?? [
        { id: 'r1', nom: 'Alice', ordre: 0 },
        { id: 'r2', nom: 'Bob', ordre: 1 },
        { id: 'r3', nom: 'Claire', ordre: 2 }
      ],
      totalRunnersCount: props.totalRunnersCount ?? 3,
      hasPassages: props.hasPassages ?? false
    },
    global: {
      plugins: [PrimeVue],
      stubs: {
        Dialog: {
          template: '<div v-if="visible"><slot></slot><slot name="footer"></slot></div>',
          props: ['visible']
        }
      }
    }
  })
}

describe('RelayGroupModal', () => {
  it('removeRunner supprime le coureur à l\'index donné et réordonne', async () => {
    const wrapper = mountRelayGroupModal()
    const deleteBtns = wrapper.findAll('.relay-group-remove-btn')
    expect(deleteBtns).toHaveLength(3)
    await deleteBtns[1].trigger('click')
    const rows = wrapper.findAll('.relay-group-runner-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].find('input').element.value).toBe('Alice')
    expect(rows[1].find('input').element.value).toBe('Claire')
    wrapper.unmount()
  })

  it('removeRunner ne fait rien si un seul coureur', async () => {
    const wrapper = mountRelayGroupModal({
      runners: [{ id: 'r1', nom: 'Alice', ordre: 0 }],
      totalRunnersCount: 1
    })
    const deleteBtns = wrapper.findAll('.relay-group-remove-btn')
    expect(deleteBtns).toHaveLength(0)
    expect(wrapper.findAll('.relay-group-runner-row')).toHaveLength(1)
    wrapper.unmount()
  })

  it('bouton suppr. masqué quand hasPassages=true', () => {
    const wrapper = mountRelayGroupModal({ hasPassages: true })
    const deleteBtns = wrapper.findAll('.relay-group-remove-btn')
    expect(deleteBtns).toHaveLength(0)
    wrapper.unmount()
  })

  it('bouton suppr. visible quand hasPassages=false et plus d\'un coureur', () => {
    const wrapper = mountRelayGroupModal({
      hasPassages: false,
      runners: [
        { id: 'r1', nom: 'Alice', ordre: 0 },
        { id: 'r2', nom: 'Bob', ordre: 1 }
      ],
      totalRunnersCount: 2
    })
    const deleteBtns = wrapper.findAll('.relay-group-remove-btn')
    expect(deleteBtns).toHaveLength(2)
    wrapper.unmount()
  })
})
