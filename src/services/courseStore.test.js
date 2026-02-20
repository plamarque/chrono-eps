import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/chronoDb.js'
import { saveCourse, loadCourse, listCourses, deleteCourse } from './courseStore.js'

describe('courseStore', () => {
  beforeEach(async () => {
    await db.courses.clear()
    await db.course_participants.clear()
    await db.passages.clear()
    if (db.relay_students) await db.relay_students.clear()
  })

  it('saveCourse retourne un UUID et persiste la course', async () => {
    const id = await saveCourse({
      nom: 'Course test',
      participants: [{ id: 'p1', nom: 'Alice', color: '#3b82f6' }],
      passagesByParticipant: {
        p1: [{ tourNum: 1, lapMs: 30000, totalMs: 30000 }]
      },
      chronoStartMs: 1000000,
      statusAtSave: 'paused'
    })
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    const loaded = await loadCourse(id)
    expect(loaded).toBeTruthy()
    expect(loaded.nom).toBe('Course test')
    expect(loaded.participants).toHaveLength(1)
    expect(loaded.participants[0]).toMatchObject({ id: 'p1', nom: 'Alice' })
    expect(loaded.passagesByParticipant.p1).toHaveLength(1)
    expect(loaded.passagesByParticipant.p1[0]).toMatchObject({
      tourNum: 1,
      lapMs: 30000,
      totalMs: 30000
    })
  })

  it('saveCourse en mode solo crée un participant virtuel', async () => {
    const id = await saveCourse({
      nom: 'Solo',
      participants: [],
      passagesByParticipant: {
        __solo__: [{ tourNum: 1, lapMs: 15000, totalMs: 15000 }]
      },
      chronoStartMs: 0,
      statusAtSave: 'paused'
    })
    const loaded = await loadCourse(id)
    expect(loaded.participants).toHaveLength(0)
    expect(loaded.passagesByParticipant.__solo__).toHaveLength(1)
    expect(loaded.passagesByParticipant.__solo__[0].totalMs).toBe(15000)
  })

  it('loadCourse retourne null pour un id inexistant', async () => {
    const result = await loadCourse('00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })

  it('loadCourse retourne statusAtSave', async () => {
    const id = await saveCourse({
      nom: 'Course idle',
      participants: [{ id: 'p1', nom: 'Alice', color: '#fff' }],
      passagesByParticipant: {},
      chronoStartMs: null,
      statusAtSave: 'idle'
    })
    const loaded = await loadCourse(id)
    expect(loaded.statusAtSave).toBe('idle')
  })

  it('loadCourse retourne statusAtSave paused pour une course terminée', async () => {
    const id = await saveCourse({
      nom: 'Course terminée',
      participants: [{ id: 'p1', nom: 'Bob', color: '#fff' }],
      passagesByParticipant: { p1: [{ tourNum: 1, lapMs: 60000, totalMs: 60000 }] },
      chronoStartMs: 0,
      statusAtSave: 'paused'
    })
    const loaded = await loadCourse(id)
    expect(loaded.statusAtSave).toBe('paused')
  })

  it('listCourses retourne les courses triées par date décroissante', async () => {
    await saveCourse({
      nom: 'Première',
      participants: [],
      passagesByParticipant: {},
      chronoStartMs: null,
      statusAtSave: 'idle'
    })
    await new Promise((r) => setTimeout(r, 10))
    await saveCourse({
      nom: 'Deuxième',
      participants: [],
      passagesByParticipant: {},
      chronoStartMs: null,
      statusAtSave: 'idle'
    })
    const list = await listCourses()
    expect(list).toHaveLength(2)
    expect(list[0].nom).toBe('Deuxième')
    expect(list[1].nom).toBe('Première')
  })

  it('saveCourse en mode relais persiste groupes et élèves', async () => {
    const id = await saveCourse({
      nom: 'Relais 4x100',
      participants: [{ id: 'g1', nom: 'Groupe A', color: '#ef4444' }],
      passagesByParticipant: {
        g1: [
          { tourNum: 1, lapMs: 15000, totalMs: 15000, studentIndex: 0 },
          { tourNum: 2, lapMs: 16000, totalMs: 31000, studentIndex: 1 }
        ]
      },
      chronoStartMs: 0,
      statusAtSave: 'paused',
      mode: 'relay',
      groupStudents: {
        g1: [
          { id: 's1', nom: 'Alice', ordre: 0 },
          { id: 's2', nom: 'Bob', ordre: 1 },
          { id: 's3', nom: 'Claire', ordre: 2 },
          { id: 's4', nom: 'David', ordre: 3 }
        ]
      }
    })
    const loaded = await loadCourse(id)
    expect(loaded.mode).toBe('relay')
    expect(loaded.participants).toHaveLength(1)
    expect(loaded.groupStudents.g1).toHaveLength(4)
    expect(loaded.groupStudents.g1[0]).toMatchObject({ nom: 'Alice', ordre: 0 })
    expect(loaded.passagesByParticipant.g1[0].studentIndex).toBe(0)
    expect(loaded.passagesByParticipant.g1[1].studentIndex).toBe(1)
  })

  it('deleteCourse supprime la course et ses données', async () => {
    const id = await saveCourse({
      nom: 'À supprimer',
      participants: [{ id: 'p1', nom: 'X', color: '#fff' }],
      passagesByParticipant: { p1: [{ tourNum: 1, lapMs: 1000, totalMs: 1000 }] },
      chronoStartMs: 0,
      statusAtSave: 'paused'
    })
    await deleteCourse(id)
    const loaded = await loadCourse(id)
    expect(loaded).toBeNull()
    const list = await listCourses()
    expect(list.find((c) => c.id === id)).toBeUndefined()
  })
})
