<script setup>
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { createRelayStudent, safeRelayStudentNom } from '../models/participant.js'
import { COULEURS_PALETTE } from '../models/participant.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  group: { type: Object, default: null },
  students: { type: Array, default: () => [] },
  /** Nombre total d'élèves dans tous les groupes (numérotation continue entre groupes). */
  totalStudentsCount: { type: Number, default: 0 }
})

const emit = defineEmits(['update:visible', 'save', 'remove', 'hide'])

const groupNom = ref('')
const groupColor = ref(COULEURS_PALETTE[0])
const studentsForm = ref([])

watch(
  () => [props.visible, props.group, props.students],
  () => {
    if (props.visible && props.group) {
      groupNom.value = props.group.nom ?? ''
      groupColor.value = props.group.color ?? COULEURS_PALETTE[0]
      let sorted = [...(props.students ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
      if (sorted.length === 0) {
        const total = Number(props.totalStudentsCount) || 0
        sorted = [createRelayStudent(total + 1, 0)]
      }
      studentsForm.value = sorted.map((s, i) => ({
        id: s.id ?? crypto.randomUUID(),
        nom: safeRelayStudentNom(s.nom ?? '', i),
        ordre: i
      }))
    }
  },
  { immediate: true }
)

function updateStudent(index, field, value) {
  if (!studentsForm.value[index]) return
  studentsForm.value = studentsForm.value.map((s, i) =>
    i === index ? { ...s, [field]: value } : s
  )
}

function addStudent() {
  const n = studentsForm.value.length
  const total = Number(props.totalStudentsCount) || 0
  const currentGroupSavedCount = props.students?.length ?? 0
  const nextNum = total - currentGroupSavedCount + n + 1
  studentsForm.value = [...studentsForm.value, createRelayStudent(nextNum, n)]
}

function removeLastStudent() {
  if (studentsForm.value.length <= 1) return
  studentsForm.value = studentsForm.value.slice(0, -1)
}

function save() {
  if (!props.group) return
  const total = Number(props.totalStudentsCount) || 0
  const currentGroupSavedCount = props.students?.length ?? 0
  const students = studentsForm.value.map((s, i) => {
    const defaultNum = total - currentGroupSavedCount + i + 1
    const safeDefaultNum = Number.isFinite(defaultNum) ? Math.max(1, defaultNum) : i + 1
    return {
      ...s,
      nom: (s.nom ?? '').trim() || `Élève ${safeDefaultNum}`,
      ordre: s.ordre ?? i
    }
  })
  const groupUpdate = {
    ...props.group,
    nom: (groupNom.value ?? '').trim() || props.group.nom,
    color: groupColor.value
  }
  emit('save', { group: groupUpdate, students })
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
        v-for="(student, i) in studentsForm"
        :key="student.id"
        class="relay-group-student-row"
      >
        <span class="relay-group-ordre">{{ i + 1 }}.</span>
        <InputText
          :model-value="studentsForm[i]?.nom"
          :placeholder="`Élève ${i + 1}`"
          class="relay-group-nom-input"
          @update:model-value="(v) => updateStudent(i, 'nom', v)"
        />
      </div>
      <div class="relay-group-student-actions">
        <Button
          label="Ajouter un élève"
          icon="pi pi-plus"
          severity="secondary"
          size="small"
          @click="addStudent"
        />
        <Button
          v-if="studentsForm.length > 1"
          label="Supprimer le dernier"
          icon="pi pi-minus"
          severity="secondary"
          size="small"
          text
          @click="removeLastStudent"
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

.relay-group-student-row {
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

.relay-group-student-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.participant-btn {
  min-height: 44px;
  min-width: 44px;
}
</style>
