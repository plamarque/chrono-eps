import * as XLSX from 'xlsx'
import { formatTime } from '../utils/formatTime.js'
import { getMaxTotalMsFromPassages } from '../utils/courseUtils.js'
import { safeRelayRunnerNom } from '../models/participant.js'

const EMPTY_CELL = '-'

/**
 * Génère le nom de fichier pour l'export.
 * @param {string} courseNom - Nom de la course
 * @param {string} createdAt - Date ISO
 * @returns {string}
 */
export function buildExportFilename(courseNom, createdAt) {
  const sanitized = (courseNom || 'Course')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 50)
  const d = createdAt ? new Date(createdAt) : new Date()
  const dateStr = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/\s+/g, '_')
  return `${sanitized}_${dateStr}.xlsx`
}

/**
 * Construit les données d'export pour le mode individuel.
 * @param {Object} course
 * @returns {Array<Array<string|number>>} Lignes pour la feuille Excel
 */
export function buildExportDataIndividual(course) {
  const { participants, passagesByParticipant } = course
  if (!participants?.length) return []

  const allPassages = Object.values(passagesByParticipant ?? {}).flat()
  const maxTourNum = allPassages.length > 0
    ? Math.max(...allPassages.map((p) => p.tourNum ?? 0))
    : 0
  const totalCourseMs = getMaxTotalMsFromPassages(passagesByParticipant)

  const header = ['Coureur', ...Array.from({ length: maxTourNum }, (_, i) => `Tour ${i + 1}`), 'Total']
  const rows = [header]

  for (const p of participants) {
    const passages = (passagesByParticipant[p.id] ?? [])
      .slice()
      .sort((a, b) => (a.tourNum ?? 0) - (b.tourNum ?? 0))
    const tourMap = Object.fromEntries(passages.map((pass) => [pass.tourNum, pass.lapMs]))
    const totalMs = passages.length > 0 ? passages[passages.length - 1].totalMs : null

    const row = [
      p.nom ?? 'Coureur',
      ...Array.from({ length: maxTourNum }, (_, i) => {
        const lapMs = tourMap[i + 1]
        return lapMs != null ? formatTime(lapMs) : EMPTY_CELL
      }),
      totalMs != null ? formatTime(totalMs) : EMPTY_CELL
    ]
    rows.push(row)
  }

  const totalRow = [
    'Total course',
    ...Array(maxTourNum).fill(''),
    totalCourseMs > 0 ? formatTime(totalCourseMs) : EMPTY_CELL
  ]
  rows.push(totalRow)

  return rows
}

/**
 * Construit les données d'export pour un groupe en mode relais.
 * @param {Object} group - { id, nom }
 * @param {Array} runners - Coureurs du groupe [{ nom, ordre }]
 * @param {Array} passages - Passages du groupe [{ tourNum, lapMs, totalMs, studentIndex }]
 * @returns {Array<Array<string|number>>}
 */
function buildExportDataRelayGroup(group, runners, passages) {
  const sortedRunners = [...(runners ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const sortedPassages = [...(passages ?? [])].sort((a, b) => (a.tourNum ?? 0) - (b.tourNum ?? 0))

  const byRunner = {}
  for (let i = 0; i < sortedRunners.length; i++) {
    const r = sortedRunners[i]
    byRunner[i] = {
      nom: safeRelayRunnerNom(r?.nom, i),
      passages: []
    }
  }
  if (sortedRunners.length === 0) {
    byRunner[0] = { nom: safeRelayRunnerNom('', 0), passages: [] }
  }

  for (const p of sortedPassages) {
    const idx = Number.isFinite(p.studentIndex) ? p.studentIndex : 0
    if (!byRunner[idx]) {
      byRunner[idx] = { nom: safeRelayRunnerNom('', idx), passages: [] }
    }
    byRunner[idx].passages.push({ tourNum: p.tourNum, lapMs: p.lapMs })
  }

  const groupTotalMs = sortedPassages.length > 0 ? sortedPassages[sortedPassages.length - 1].totalMs : null
  const maxTourNum = sortedPassages.length > 0
    ? Math.max(...sortedPassages.map((p) => p.tourNum ?? 0))
    : 0

  const header = ['Coureur', ...Array.from({ length: maxTourNum }, (_, i) => `Tour ${i + 1}`), 'Total']
  const rows = [header]

  const runnerIndices = Object.keys(byRunner)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b)

  for (const idx of runnerIndices) {
    const r = byRunner[idx]
    const tourMap = Object.fromEntries(r.passages.map((pass) => [pass.tourNum, pass.lapMs]))
    const totalLapMs = r.passages.reduce((sum, p) => sum + (p.lapMs ?? 0), 0)

    const row = [
      r.nom,
      ...Array.from({ length: maxTourNum }, (_, i) => {
        const lapMs = tourMap[i + 1]
        return lapMs != null ? formatTime(lapMs) : EMPTY_CELL
      }),
      totalLapMs > 0 ? formatTime(totalLapMs) : EMPTY_CELL
    ]
    rows.push(row)
  }

  const totalRow = [
    'Total groupe',
    ...Array(maxTourNum).fill(''),
    groupTotalMs != null ? formatTime(groupTotalMs) : EMPTY_CELL
  ]
  rows.push(totalRow)

  return rows
}

/**
 * Construit les données d'export pour le mode relais (toutes les feuilles).
 * @param {Object} course
 * @returns {Array<{ sheetName: string, rows: Array<Array> }>}
 */
export function buildExportDataRelay(course) {
  const { participants, passagesByParticipant, groupRunners } = course
  const groups = participants ?? []
  const result = []

  for (const group of groups) {
    const runners = groupRunners?.[group.id] ?? []
    const passages = passagesByParticipant?.[group.id] ?? []
    const rows = buildExportDataRelayGroup(group, runners, passages)
    const sheetName = (group.nom || `Groupe ${result.length + 1}`).slice(0, 31)
    result.push({ sheetName, rows })
  }

  return result
}

/**
 * Crée un workbook Excel à partir d'une course.
 * @param {Object} course
 * @returns {Object} Workbook XLSX
 */
export function courseToExcelWorkbook(course) {
  const wb = XLSX.utils.book_new()
  const mode = course.mode || 'individual'

  const metaRows = [
    ['Course', course.nom ?? 'Course sans nom'],
    ['Date', course.createdAt ? new Date(course.createdAt).toLocaleString('fr-FR') : ''],
    ['Mode', mode === 'relay' ? 'Relais' : 'Individuel']
  ]

  if (mode === 'individual') {
    const dataRows = buildExportDataIndividual(course)
    const allRows = [...metaRows, [], ...dataRows]
    const ws = XLSX.utils.aoa_to_sheet(allRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Course')
  } else {
    const sheets = buildExportDataRelay(course)
    for (let i = 0; i < sheets.length; i++) {
      const { sheetName, rows } = sheets[i]
      const allRows = i === 0 ? [...metaRows, [], ...rows] : rows
      const ws = XLSX.utils.aoa_to_sheet(allRows)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }
  }

  return wb
}

/**
 * Exporte une course en blob Excel.
 * @param {Object} course
 * @returns {Promise<Blob>}
 */
export async function exportCourseAsExcelBlob(course) {
  const wb = courseToExcelWorkbook(course)
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

/**
 * Partage ou télécharge le fichier Excel via Web Share API ou fallback.
 * En cas d'échec du partage (permission refusée, etc.), bascule sur le téléchargement.
 * @param {Blob} blob
 * @param {string} filename
 * @returns {Promise<void>}
 * @throws {{ cancelled: true }} Si l'utilisateur annule le partage (AbortError)
 */
export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const doDownload = () => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      const shareData = isIOS ? { files: [file] } : { title: filename, files: [file] }
      await navigator.share(shareData)
      return
    } catch (err) {
      if (err.name === 'AbortError') {
        const e = new Error('Partage annulé')
        e.cancelled = true
        throw e
      }
      if (isIOS) {
        throw new Error('Le partage a échoué. Réessayez en appuyant à nouveau sur Exporter.')
      }
      doDownload()
    }
  } else {
    if (isIOS) {
      throw new Error('Le partage n\'est pas disponible. Utilisez une version récente d\'iOS.')
    }
    doDownload()
  }
}
