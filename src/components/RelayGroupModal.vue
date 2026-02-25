<script setup>
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { createRelayRunner, safeRelayRunnerNom } from '../models/participant.js'
import { COULEURS_PALETTE } from '../models/participant.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  group: { type: Object, default: null },
  runners: { type: Array, default: () => [] },
  /** Nombre total de coureurs dans tous les groupes (numérotation continue entre groupes). */
  totalRunnersCount: { type: Number, default: 0 }
})

const emit = defineEmits(['update:visible', 'save', 'remove', 'hide'])

const groupNom = ref('')
const groupColor = ref(COULEURS_PALETTE[0])
const runnersForm = ref([])

watch(
  () => [props.visible, props.group, props.runners],
  () => {
    if (props.visible && props.group) {
      groupNom.value = props.group.nom ?? ''
      groupColor.value = props.group.color ?? COULEURS_PALETTE[0]
      let sorted = [...(props.runners ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
      if (sorted.length === 0) {
        const total = Number(props.totalRunnersCount) || 0
        sorted = [createRelayRunner(total + 1, 0)]
      }
      runnersForm.value = sorted.map((r, i) => ({
        id: r.id ?? crypto.randomUUID(),
        nom: safeRelayRunnerNom(r.nom ?? '', i),
        ordre: i
      }))
    }
  },
  { immediate: true }
)

function updateRunner(index, field, value) {
  if (!runnersForm.value[index]) return
  runnersForm.value = runnersForm.value.map((r, i) =>
    i === index ? { ...r, [field]: value } : r
  )
}

function addRunner() {
  const n = runnersForm.value.length
  const total = Number(props.totalRunnersCount) || 0
  const currentGroupSavedCount = props.runners?.length ?? 0
  const nextNum = total - currentGroupSavedCount + n + 1
  runnersForm.value = [...runnersForm.value, createRelayRunner(nextNum, n)]
}

function removeLastRunner() {
  if (runnersForm.value.length <= 1) return
  runnersForm.value = runnersForm.value.slice(0, -1)
}

function save() {
  if (!props.group) return
  const total = Number(props.totalRunnersCount) || 0
  const currentGroupSavedCount = props.runners?.length ?? 0
  const runners = runnersForm.value.map((r, i) => {
    const defaultNum = total - currentGroupSavedCount + i + 1
    const safeDefaultNum = Number.isFinite(defaultNum) ? Math.max(1, defaultNum) : i + 1
    return {
      ...r,
      nom: (r.nom ?? '').trim() || `Coureur ${safeDefaultNum}`,
      ordre: r.ordre ?? i
    }
  })
  const groupUpdate = {
    ...props.group,
    nom: (groupNom.value ?? '').trim() || props.group.nom,
    color: groupColor.value
  }
  emit('save', { group: groupUpdate, runners })
}

function remove() {
  emit('remove')
}

function onHide() {
  emit('hide')
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="group ? `Configurer ${group.nom}` : 'Groupe'"
    modal
    :style="{ width: 'min(90vw, 24rem)' }"
    @update:visible="(v) => emit('update:visible', v)"
    @hide="onHide"
  >
    <div v-if="group" class="relay-group-modal">
      <div class="relay-group-fields">
        <div class="relay-group-field">
          <label for="group-nom">Nom du groupe</label>
          <InputText
            id="group-nom"
            v-model="groupNom"
            placeholder="Ex. Groupe A"
            class="relay-group-input"
          />
        </div>
        <div class="relay-group-field">
          <label>Couleur</label>
          <div class="relay-group-colors">
            <button
              v-for="c in COULEURS_PALETTE"
              :key="c"
              type="button"
              class="relay-group-color-btn"
              :class="{ active: groupColor === c }"
              :style="{ backgroundColor: c }"
              :aria-label="`Couleur ${c}`"
              @click="groupColor = c"
            />
          </div>
        </div>
      </div>
      <div
        v-for="(runner, i) in runnersForm"
        :key="runner.id"
        class="relay-group-runner-row"
      >
        <span class="relay-group-ordre">{{ i + 1 }}.</span>
        <InputText
          :model-value="runnersForm[i]?.nom"
          :placeholder="`Coureur ${i + 1}`"
          class="relay-group-nom-input"
          @update:model-value="(v) => updateRunner(i, 'nom', v)"
        />
      </div>
      <div class="relay-group-runner-actions">
        <Button
          label="Ajouter un coureur"
          icon="pi pi-plus"
          severity="secondary"
          size="small"
          @click="addRunner"
        />
        <Button
          v-if="runnersForm.length > 1"
          label="Supprimer le dernier"
          icon="pi pi-minus"
          severity="secondary"
          size="small"
          text
          @click="removeLastRunner"
        />
      </div>
    </div>

    <template #footer>
      <Button
        label="Supprimer le groupe"
        severity="danger"
        icon="pi pi-trash"
        class="participant-btn"
        @click="remove"
      />
      <Button
        label="Enregistrer"
        severity="primary"
        class="participant-btn"
        @click="save"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.relay-group-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.relay-group-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.relay-group-field label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #1a1a1a;
  font-size: 0.9rem;
}

.relay-group-input {
  width: 100%;
  min-height: 44px;
}

.relay-group-colors {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.relay-group-color-btn {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
}

.relay-group-color-btn.active {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #1a1a1a;
}

.relay-group-runner-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.relay-group-ordre {
  font-weight: 600;
  min-width: 1.5rem;
  color: #1a1a1a;
}

.relay-group-nom-input {
  flex: 1;
  min-width: 8rem;
  min-height: 44px;
}

.relay-group-runner-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.participant-btn {
  min-height: 44px;
  min-width: 44px;
}
</style>
