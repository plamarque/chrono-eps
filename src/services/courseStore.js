import { db } from '../db/chronoDb.js'

const SOLO_ID = '__solo__'

/** Normalise les noms "Élève X" / "Elève X" en "Coureur X" pour l'affichage (rétrocompatibilité). */
function normalizeRunnerDisplayName(nom) {
  if (typeof nom !== 'string') return nom
  return nom.replace(/^Élève (\d+)$/, 'Coureur $1').replace(/^Elève (\d+)$/, 'Coureur $1')
}

/**
 * Sauvegarde une course avec nom, participants et passages.
 * @param {Object} payload
 * @param {string} payload.nom - Nom de la course
 * @param {Array<{id:string,nom:string,color:string}>} payload.participants
 * @param {Object} payload.passagesByParticipant - { [participantId]: [{ tourNum, lapMs, totalMs, studentIndex? }] }
 * @param {number|null} payload.chronoStartMs - Epoch ms du démarrage chrono (null si solo sans chrono démarré)
 * @param {string} payload.statusAtSave - 'idle' | 'running' | 'paused'
 * @param {'individual'|'relay'} [payload.mode] - Mode de la course (défaut 'individual')
 * @param {2|4} [payload.nbPassagesRelay] - Nombre de passages par coureur dans chaque groupe (quand mode=relay)
 * @param {Object} [payload.groupRunners] - { [groupId]: [{ id, nom, ordre }] } (quand mode=relay ; couleur = propriété du groupe)
 * @returns {Promise<string>} ID de la course
 */
export async function saveCourse({
  nom,
  participants,
  passagesByParticipant,
  chronoStartMs,
  statusAtSave,
  mode = 'individual',
  nbPassagesRelay,
  groupRunners = {}
}) {
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
      const passageRow = {
        id: crypto.randomUUID(),
        courseId,
        participantId,
        tourNum: p.tourNum,
        timestampMs
      }
      if (mode === 'relay' && p.studentIndex !== undefined) {
        passageRow.studentIndex = p.studentIndex
      }
      passagesToSave.push(passageRow)
    }
  }

  // relay_runners : coureurs par groupe (mode relay)
  const relayRunnersToSave = []
  if (mode === 'relay') {
    for (const [groupId, runners] of Object.entries(groupRunners)) {
      if (!Array.isArray(runners)) continue
      for (const r of runners) {
        relayRunnersToSave.push({
          id: crypto.randomUUID(),
          courseId,
          groupParticipantId: groupId,
          ordre: r.ordre ?? 0,
          nom: r.nom ?? ''
        })
      }
    }
  }

  const tables = mode === 'relay'
    ? [db.courses, db.course_participants, db.passages, db.relay_runners]
    : [db.courses, db.course_participants, db.passages]

  await db.transaction('rw', ...tables, async () => {
    await db.courses.add({
      id: courseId,
      nom: nom.trim() || 'Course sans nom',
      createdAt,
      chronoStartMs: chronoStartMs ?? null,
      statusAtSave: statusAtSave || 'idle',
      mode: mode || 'individual',
      nbPassagesRelay: mode === 'relay' ? nbPassagesRelay : null
    })
    for (const p of participantsToSave) {
      await db.course_participants.add(p)
    }
    for (const p of passagesToSave) {
      await db.passages.add(p)
    }
    if (mode === 'relay') {
      for (const r of relayRunnersToSave) {
        await db.relay_runners.add(r)
      }
    }
  })

  return courseId
}

/**
 * Charge une course par ID.
 * @param {string} courseId
 * @returns {Promise<{id:string,nom:string,createdAt:string,participants:Array,passagesByParticipant:Object,mode:string,nbPassagesRelay:number|null,groupRunners:Object,statusAtSave:string}>}
 */
export async function loadCourse(courseId) {
  const [course, participantsRows, passages, relayRunners] = await Promise.all([
    db.courses.get(courseId),
    db.course_participants.where('courseId').equals(courseId).sortBy('order'),
    db.passages.where('courseId').equals(courseId).toArray(),
    db.relay_runners.where('courseId').equals(courseId).toArray()
  ])

  if (!course) return null

  const mode = course.mode || 'individual'

  const chronoStartMs = course.chronoStartMs
  const passagesByParticipant = {}

  // Trier les passages par (participantId, tourNum) pour que le calcul de lapMs soit correct
  const passagesSorted = [...passages].sort((a, b) => {
    if (a.participantId !== b.participantId) return String(a.participantId).localeCompare(b.participantId)
    return a.tourNum - b.tourNum
  })

  for (const p of passagesSorted) {
    if (!passagesByParticipant[p.participantId]) passagesByParticipant[p.participantId] = []
    const timestampMs = p.timestampMs
    const totalMs = chronoStartMs != null ? timestampMs - chronoStartMs : timestampMs
    const prev = passagesByParticipant[p.participantId]
    const lastTotal = prev.length > 0 ? prev[prev.length - 1].totalMs : 0
    const lapMs = totalMs - lastTotal
    const entry = { tourNum: p.tourNum, lapMs, totalMs }
    if (p.studentIndex !== undefined) entry.studentIndex = p.studentIndex
    passagesByParticipant[p.participantId].push(entry)
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
        .map(({ participantId, nom, color }) => ({
          id: participantId,
          nom: normalizeRunnerDisplayName(nom),
          color: color ?? '#94a3b8'
        }))

  // Reconstruire groupRunners (mode relay)
  const groupRunners = {}
  if (mode === 'relay' && Array.isArray(relayRunners)) {
    for (const r of relayRunners) {
      if (!groupRunners[r.groupParticipantId]) groupRunners[r.groupParticipantId] = []
      groupRunners[r.groupParticipantId].push({
        id: r.id,
        nom: normalizeRunnerDisplayName(r.nom),
        ordre: r.ordre ?? 0
      })
    }
    for (const gid of Object.keys(groupRunners)) {
      groupRunners[gid].sort((a, b) => a.ordre - b.ordre)
    }
  }

  return {
    id: course.id,
    nom: course.nom,
    createdAt: course.createdAt,
    participants: participantsList,
    passagesByParticipant,
    chronoStartMs,
    mode,
    nbPassagesRelay: mode === 'relay' ? (course.nbPassagesRelay ?? 2) : null,
    groupRunners,
    statusAtSave: course.statusAtSave || 'idle'
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
  await db.transaction('rw', db.courses, db.course_participants, db.passages, db.relay_runners, async () => {
    await db.course_participants.where('courseId').equals(courseId).delete()
    await db.passages.where('courseId').equals(courseId).delete()
    await db.relay_runners.where('courseId').equals(courseId).delete()
    await db.courses.delete(courseId)
  })
}
