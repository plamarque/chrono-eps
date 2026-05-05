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
      runners: [{ id: 'r1', nom: 'Alice', ordre: 0 }]
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
      ]
    })
    const deleteBtns = wrapper.findAll('.relay-group-remove-btn')
    expect(deleteBtns).toHaveLength(2)
    wrapper.unmount()
  })

  it('Ajouter un coureur utilise Coureur 2 (numérotation locale au groupe)', async () => {
    const wrapper = mountRelayGroupModal({
      runners: [{ id: 'r1', nom: 'Coureur 1', ordre: 0 }]
    })
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Ajouter un coureur'))
    expect(addBtn).toBeDefined()
    await addBtn.trigger('click')
    const inputs = wrapper.findAll('.relay-group-nom-input')
    expect(inputs).toHaveLength(2)
    expect(inputs[1].element.value).toBe('Coureur 2')
    wrapper.unmount()
  })

  it('removeRunner renumérote Coureur 1..n après suppression du milieu', async () => {
    const wrapper = mountRelayGroupModal({
      runners: [
        { id: 'r1', nom: 'Coureur 1', ordre: 0 },
        { id: 'r2', nom: 'Coureur 2', ordre: 1 },
        { id: 'r3', nom: 'Coureur 3', ordre: 2 }
      ]
    })
    const deleteBtns = wrapper.findAll('.relay-group-remove-btn')
    await deleteBtns[1].trigger('click')
    const inputs = wrapper.findAll('.relay-group-nom-input')
    expect(inputs).toHaveLength(2)
    expect(inputs[0].element.value).toBe('Coureur 1')
    expect(inputs[1].element.value).toBe('Coureur 2')
    wrapper.unmount()
  })

  it('removeRunner conserve un prénom personnalisé et renumérote les Coureur k', async () => {
    const wrapper = mountRelayGroupModal({
      runners: [
        { id: 'r1', nom: 'Coureur 1', ordre: 0 },
        { id: 'r2', nom: 'Alice', ordre: 1 },
        { id: 'r3', nom: 'Coureur 3', ordre: 2 }
      ]
    })
    await wrapper.findAll('.relay-group-remove-btn')[0].trigger('click')
    const inputs = wrapper.findAll('.relay-group-nom-input')
    expect(inputs).toHaveLength(2)
    expect(inputs[0].element.value).toBe('Alice')
    expect(inputs[1].element.value).toBe('Coureur 2')
    wrapper.unmount()
  })

  it('normalise les noms legacy invalides (NaN) avec fallback local au groupe', () => {
    const wrapper = mountRelayGroupModal({
      runners: [
        { id: 'r1', nom: 'Coureur NaN', ordre: 0 },
        { id: 'r2', nom: 'coureur nan', ordre: 1 },
        { id: 'r3', nom: 'Alice', ordre: 2 }
      ]
    })
    const inputs = wrapper.findAll('.relay-group-nom-input')
    expect(inputs).toHaveLength(3)
    expect(inputs[0].element.value).toBe('Coureur 1')
    expect(inputs[1].element.value).toBe('Coureur 2')
    expect(inputs[2].element.value).toBe('Alice')
    wrapper.unmount()
  })
})
