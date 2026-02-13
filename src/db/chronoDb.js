import Dexie from 'dexie'

export const db = new Dexie('ChronoEps')

db.version(1).stores({
  courses: 'id, nom, createdAt, chronoStartMs, statusAtSave',
  course_participants: 'id, courseId, participantId, nom, color, order',
  passages: 'id, courseId, participantId, tourNum, timestampMs'
})
