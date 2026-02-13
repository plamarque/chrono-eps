import { db } from '../db/chronoDb.js'

const SOLO_ID = '__solo__'

/**
 * Sauvegarde une course avec nom, participants et passages.
 * @param {Object} payload
 * @param {string} payload.nom - Nom de la course
 * @param {Array<{id:string,nom:string,color:string}>} payload.participants
 * @param {Object} payload.passagesByParticipant - { [participantId]: [{ tourNum, lapMs, totalMs }] }
 * @param {number|null} payload.chronoStartMs - Epoch ms du démarrage chrono (null si solo sans chrono démarré)
 * @param {string} payload.statusAtSave - 'idle' | 'running' | 'paused'
 * @returns {Promise<string>} ID de la course
 */
export async function saveCourse({ nom, participants, passagesByParticipant, chronoStartMs, statusAtSave }) {
  const courseId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  // Participants : en mode solo, on crée un participant virtuel pour le stockage.
  // id = courseId::participantId pour unicité ; participantId permet le lien avec passages.
  const participantsToSave =
    participants.length === 0
      ? [{ id: `${courseId}::${SOLO_ID}`, courseId, participantId: SOLO_ID, nom: 'Course', color: '#64748b', order: 0 }]
      : participants.map((p, i) => ({
          id: `${courseId}::${p.id}`,
          courseId,
          participantId: p.id,
          nom: p.nom,
          color: p.color ?? '#94a3b8',
          order: i
        }))

  // Passages : convertir lapMs/totalMs en timestampMs
  const passagesToSave = []
  const startMs = chronoStartMs ?? 0
  for (const [participantId, passages] of Object.entries(passagesByParticipant)) {
    if (!Array.isArray(passages)) continue
    for (const p of passages) {
      const timestampMs = startMs + p.totalMs
      passagesToSave.push({
        id: crypto.randomUUID(),
        courseId,
        participantId,
        tourNum: p.tourNum,
        timestampMs
      })
    }
  }

  await db.transaction('rw', db.courses, db.course_participants, db.passages, async () => {
    await db.courses.add({
      id: courseId,
      nom: nom.trim() || 'Course sans nom',
      createdAt,
      chronoStartMs: chronoStartMs ?? null,
      statusAtSave: statusAtSave || 'idle'
    })
    for (const p of participantsToSave) {
      await db.course_participants.add(p)
    }
    for (const p of passagesToSave) {
      await db.passages.add(p)
    }
  })

  return courseId
}

/**
 * Charge une course par ID.
 * @param {string} courseId
 * @returns {Promise<{id:string,nom:string,createdAt:string,participants:Array,passagesByParticipant:Object}>}
 */
export async function loadCourse(courseId) {
  const [course, participantsRows, passages] = await Promise.all([
    db.courses.get(courseId),
    db.course_participants.where('courseId').equals(courseId).sortBy('order'),
    db.passages.where('courseId').equals(courseId).toArray()
  ])

  if (!course) return null

  const chronoStartMs = course.chronoStartMs
  const passagesByParticipant = {}

  for (const p of passages) {
    if (!passagesByParticipant[p.participantId]) passagesByParticipant[p.participantId] = []
    const timestampMs = p.timestampMs
    const totalMs = chronoStartMs != null ? timestampMs - chronoStartMs : timestampMs
    const prev = passagesByParticipant[p.participantId]
    const lastTotal = prev.length > 0 ? prev[prev.length - 1].totalMs : 0
    const lapMs = totalMs - lastTotal
    passagesByParticipant[p.participantId].push({ tourNum: p.tourNum, lapMs, totalMs })
  }

  // Trier les passages par tourNum
  for (const id of Object.keys(passagesByParticipant)) {
    passagesByParticipant[id].sort((a, b) => a.tourNum - b.tourNum)
  }

  // Reconstruire participants. En mode solo (1 participant avec participantId === SOLO_ID), on renvoie [] pour garder l'état solo.
  const isSolo = participantsRows.length === 1 && participantsRows[0].participantId === SOLO_ID
  const participantsList = isSolo
    ? []
    : participantsRows
        .filter((p) => p.participantId !== SOLO_ID)
        .map(({ participantId, nom, color }) => ({ id: participantId, nom, color: color ?? '#94a3b8' }))

  return {
    id: course.id,
    nom: course.nom,
    createdAt: course.createdAt,
    participants: participantsList,
    passagesByParticipant,
    chronoStartMs
  }
}

/**
 * Liste les courses sauvegardées, triées par date décroissante.
 * @returns {Promise<Array<{id:string,nom:string,createdAt:string}>>}
 */
export async function listCourses() {
  return db.courses.orderBy('createdAt').reverse().toArray()
}

/**
 * Supprime une course et ses données associées.
 * @param {string} courseId
 */
export async function deleteCourse(courseId) {
  await db.transaction('rw', db.courses, db.course_participants, db.passages, async () => {
    await db.course_participants.where('courseId').equals(courseId).delete()
    await db.passages.where('courseId').equals(courseId).delete()
    await db.courses.delete(courseId)
  })
}
