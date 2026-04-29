import { describe, it, expect } from 'vitest'
import {
  buildExportFilename,
  buildExportDataIndividual,
  buildExportDataRelay,
  courseToExcelWorkbook,
  exportCourseAsExcelBlob
} from './exportCourseExcel.js'

describe('exportCourseExcel', () => {
  describe('buildExportFilename', () => {
    it('sanitize le nom et ajoute la date', () => {
      const name = buildExportFilename('Course 6e A', '2025-02-25T14:30:00.000Z')
      expect(name).toMatch(/^Course_6e_A_.*\.xlsx$/)
    })

    it('remplace les caractères interdits', () => {
      const name = buildExportFilename('Test: course <important>', null)
      expect(name).not.toMatch(/[<>:"/\\|?*]/)
    })
  })

  describe('buildExportDataIndividual', () => {
    it('retourne les lignes pour une course individuelle', () => {
      const course = {
        participants: [
          { id: 'p1', nom: 'Alice', color: '#fff' },
          { id: 'p2', nom: 'Bob', color: '#000' }
        ],
        passagesByParticipant: {
          p1: [
            { tourNum: 1, lapMs: 45230, totalMs: 45230 },
            { tourNum: 2, lapMs: 52100, totalMs: 97330 }
          ],
          p2: [{ tourNum: 1, lapMs: 48000, totalMs: 48000 }]
        }
      }
      const rows = buildExportDataIndividual(course)
      expect(rows[0]).toEqual(['Coureur', 'Tour 1', 'Tour 2', 'Total'])
      expect(rows[1][0]).toBe('Alice')
      expect(rows[1][1]).toBe('00:45.23')
      expect(rows[1][2]).toBe('00:52.10')
      expect(rows[1][3]).toBe('01:37.33')
      expect(rows[2][0]).toBe('Bob')
      expect(rows[2][1]).toBe('00:48.00')
      expect(rows[2][2]).toBe('-')
      expect(rows[2][3]).toBe('00:48.00')
      expect(rows[3][0]).toBe('Total course')
      expect(rows[3][3]).toBe('01:37.33')
    })

    it('retourne un tableau vide si pas de participants', () => {
      const course = { participants: [], passagesByParticipant: {} }
      expect(buildExportDataIndividual(course)).toEqual([])
    })

    it('export arrivées séquentielles : deux colonnes Coureur / Temps d\'arrivée', () => {
      const course = {
        participants: [
          { id: 'p1', nom: 'Coureur 1', color: '#fff' },
          { id: 'p2', nom: 'Alice', color: '#000' }
        ],
        passagesByParticipant: {
          p1: [{ tourNum: 1, lapMs: 45230, totalMs: 45230 }],
          p2: [{ tourNum: 1, lapMs: 48000, totalMs: 48000 }]
        }
      }
      const rows = buildExportDataIndividual(course)
      expect(rows[0]).toEqual(['Coureur', "Temps d'arrivée"])
      expect(rows[1][0]).toBe('Coureur 1')
      expect(rows[1][1]).toBe('00:45.23')
      expect(rows[2][0]).toBe('Alice')
      expect(rows[2][1]).toBe('00:48.00')
      expect(rows[3][0]).toBe('Durée max. course')
      expect(rows[3][1]).toBe('00:48.00')
    })

    it('colonne Total = somme des lapMs même si totalMs enregistrés est incohérent', () => {
      const course = {
        participants: [{ id: 'p1', nom: 'Alice', color: '#fff' }],
        passagesByParticipant: {
          p1: [
            { tourNum: 1, lapMs: 10000, totalMs: 10000 },
            { tourNum: 2, lapMs: 20000, totalMs: 999999 }
          ]
        }
      }
      const rows = buildExportDataIndividual(course)
      expect(rows[0]).toEqual(['Coureur', 'Tour 1', 'Tour 2', 'Total'])
      expect(rows[1][3]).toBe('00:30.00')
      expect(rows[2][3]).toBe('00:30.00')
    })

    it('gère le mode solo (participants vides, passages sous __solo__)', () => {
      const course = {
        participants: [],
        passagesByParticipant: {
          __solo__: [
            { tourNum: 1, lapMs: 15000, totalMs: 15000 },
            { tourNum: 2, lapMs: 18000, totalMs: 33000 }
          ]
        }
      }
      const rows = buildExportDataIndividual(course)
      expect(rows[0]).toEqual(['Coureur', 'Tour 1', 'Tour 2', 'Total'])
      expect(rows[1][0]).toBe('Course')
      expect(rows[1][1]).toBe('00:15.00')
      expect(rows[1][2]).toBe('00:18.00')
      expect(rows[1][3]).toBe('00:33.00')
      expect(rows[2][0]).toBe('Total course')
      expect(rows[2][3]).toBe('00:33.00')
    })
  })

  describe('buildExportDataRelay', () => {
    it('retourne une feuille par groupe avec coureurs et total', () => {
      const course = {
        mode: 'relay',
        participants: [
          { id: 'g1', nom: 'Groupe 1', color: '#ef4444' }
        ],
        passagesByParticipant: {
          g1: [
            { tourNum: 1, lapMs: 45000, totalMs: 45000, studentIndex: 0 },
            { tourNum: 2, lapMs: 52000, totalMs: 97000, studentIndex: 1 }
          ]
        },
        groupRunners: {
          g1: [
            { nom: 'Alice', ordre: 0 },
            { nom: 'Bob', ordre: 1 }
          ]
        }
      }
      const sheets = buildExportDataRelay(course)
      expect(sheets).toHaveLength(1)
      expect(sheets[0].sheetName).toBe('Groupe 1')
      const rows = sheets[0].rows
      expect(rows[0]).toEqual(['Coureur', 'Tour 1', 'Tour 2', 'Total'])
      expect(rows[1][0]).toBe('Alice')
      expect(rows[1][1]).toBe('00:45.00')
      expect(rows[1][2]).toBe('-')
      expect(rows[1][3]).toBe('00:45.00')
      expect(rows[2][0]).toBe('Bob')
      expect(rows[2][1]).toBe('-')
      expect(rows[2][2]).toBe('00:52.00')
      expect(rows[2][3]).toBe('00:52.00')
      expect(rows[3][0]).toBe('Total groupe')
      expect(rows[3][3]).toBe('01:37.00')
    })
  })

  describe('courseToExcelWorkbook', () => {
    it('crée un workbook avec une feuille pour le mode individuel', () => {
      const course = {
        nom: 'Test',
        createdAt: '2025-02-25T12:00:00.000Z',
        mode: 'individual',
        participants: [{ id: 'p1', nom: 'Alice', color: '#fff' }],
        passagesByParticipant: { p1: [{ tourNum: 1, lapMs: 60000, totalMs: 60000 }] }
      }
      const wb = courseToExcelWorkbook(course)
      expect(wb.getWorksheet('Course')).toBeTruthy()
    })

    it('crée une feuille par groupe pour le mode relais', () => {
      const course = {
        nom: 'Relais test',
        createdAt: '2025-02-25T12:00:00.000Z',
        mode: 'relay',
        participants: [
          { id: 'g1', nom: 'Rouge', color: '#ef4444' },
          { id: 'g2', nom: 'Bleu', color: '#3b82f6' }
        ],
        passagesByParticipant: {
          g1: [{ tourNum: 1, lapMs: 50000, totalMs: 50000, studentIndex: 0 }],
          g2: []
        },
        groupRunners: {
          g1: [{ nom: 'Alice', ordre: 0 }],
          g2: [{ nom: 'Bob', ordre: 0 }]
        }
      }
      const wb = courseToExcelWorkbook(course)
      expect(wb.getWorksheet('Rouge')).toBeTruthy()
      expect(wb.getWorksheet('Bleu')).toBeTruthy()
    })
  })

  describe('exportCourseAsExcelBlob', () => {
    it('retourne un Blob de type Excel', async () => {
      const course = {
        mode: 'individual',
        participants: [{ id: 'p1', nom: 'Alice', color: '#fff' }],
        passagesByParticipant: { p1: [{ tourNum: 1, lapMs: 60000, totalMs: 60000 }] }
      }
      const blob = await exportCourseAsExcelBlob(course)
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(blob.size).toBeGreaterThan(0)
    })
  })

})
