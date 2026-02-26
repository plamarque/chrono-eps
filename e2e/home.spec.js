import { test, expect } from '@playwright/test'

const chrono = (page) => page.getByRole('region', { name: 'Chronomètre' })

test.describe('Accueil - Chronomètre', () => {
  test('Démarrer puis Arrêter met le chrono en pause', async ({ page }) => {
    await page.goto('/')
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await expect(chrono(page).getByRole('timer', { name: 'Temps écoulé' })).toBeVisible()
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await expect(chrono(page).getByRole('button', { name: 'Démarrer' })).toBeVisible()
  })

  test('Réinitialiser remet le chrono à zéro', async ({ page }) => {
    await page.goto('/')
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(500)
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await chrono(page).getByRole('button', { name: 'Réinitialiser' }).click()
    await expect(page.getByText('00:00.00')).toBeVisible()
  })
})

test.describe('Accueil - Mode individuel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
  })

  test('Ajouter un coureur affiche Coureur 2', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter un participant' }).click()
    await expect(page.getByText('Coureur 2')).toBeVisible()
  })

  test('Sauvegarder une course avec passage', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter un participant' }).click()
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Marquer passage' }).first().click()
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByLabel('Nom de la course').fill('Course E2E')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
    await expect(page.getByText('Sauvegardé')).toBeVisible()
  })
})

test.describe('Accueil - Dupliquer', () => {
  test('Dupliquer conserve la config et efface les temps', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
    await page.getByRole('button', { name: 'Ajouter un participant' }).click()
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Marquer passage' }).first().click()
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByLabel('Nom de la course').fill('À dupliquer')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
    await expect(page.getByText('Sauvegardé')).toBeVisible()
    await page.getByRole('button', { name: 'Dupliquer' }).click()
    await expect(page.getByRole('button', { name: 'Coureur 2' })).toBeVisible()
    await expect(page.getByText('00:00.00')).toBeVisible()
  })
})

test.describe('Accueil - Changement de mode', () => {
  test('Relais vers Individuel avec config : annuler garde le mode relais', async ({ page }) => {
    await page.goto('/')
    const participants = page.getByRole('region', { name: 'Participants' })
    await participants.getByRole('button', { name: 'Ajouter' }).click()
    await expect(page.getByText('Groupe 2')).toBeVisible()
    await page.getByRole('button', { name: 'Individuel' }).click()
    await expect(page.getByText('Changer de mode ?')).toBeVisible()
    await page.getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByText('Groupe 1')).toBeVisible()
    await expect(page.getByText('Groupe 2')).toBeVisible()
  })
})

test.describe('Accueil - Nouvelle course', () => {
  test('Nouvelle course avec config affiche dialogue', async ({ page }) => {
    await page.goto('/')
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Nouvelle course' }).click()
    await expect(page.getByText('Changer de mode ?').or(page.getByText('Nouvelle course ?'))).toBeVisible()
  })
})

test.describe('Accueil - Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', {
        value: (data) => !(data?.files?.length),
        configurable: true
      })
    })
  })

  test('Exporter après sauvegarde déclenche le téléchargement', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
    await page.getByRole('button', { name: 'Ajouter un participant' }).click()
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Marquer passage' }).first().click()
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByLabel('Nom de la course').fill('Course export E2E')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
    await expect(page.getByText('Sauvegardé')).toBeVisible()

    const exportBtn = page.getByRole('button', { name: 'Exporter' })
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await exportBtn.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
    expect(download.suggestedFilename()).toContain('Course_export_E2E')
  })
})
