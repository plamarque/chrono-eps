import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/chronoDb.js'
import { saveCourse, loadCourse, listCourses, deleteCourse } from './courseStore.js'

describe('courseStore', () => {
  beforeEach(async () => {
    await db.courses.clear()
    await db.course_participants.clear()
    await db.passages.clear()
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
