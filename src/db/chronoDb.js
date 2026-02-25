import Dexie from 'dexie'

export const db = new Dexie('ChronoEps')

db.version(1).stores({
  courses: 'id, nom, createdAt, chronoStartMs, statusAtSave',
  course_participants: 'id, courseId, participantId, nom, color, order',
  passages: 'id, courseId, participantId, tourNum, timestampMs'
})

db.version(2).stores({
  courses: 'id, nom, createdAt, chronoStartMs, statusAtSave, mode, nbPassagesRelay',
  course_participants: 'id, courseId, participantId, nom, color, order',
  passages: 'id, courseId, participantId, tourNum, timestampMs',
  relay_students: 'id, courseId, groupParticipantId, ordre'
})

db.version(3).stores({
  courses: 'id, nom, createdAt, chronoStartMs, statusAtSave, mode, nbPassagesRelay',
  course_participants: 'id, courseId, participantId, nom, color, order',
  passages: 'id, courseId, participantId, tourNum, timestampMs',
  relay_runners: 'id, courseId, groupParticipantId, ordre'
}).upgrade((trans) => {
  return trans.table('relay_students').toCollection().toArray().then((rows) => {
    if (rows.length > 0) {
      return trans.table('relay_runners').bulkAdd(rows)
    }
  })
})
