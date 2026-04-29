import { test, expect } from '@playwright/test'

test.describe('Replay', () => {
  test.beforeEach(async ({ page }) => {
    // Créer une course avec passages
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
    const chrono = page.getByRole('region', { name: 'Chronomètre' })
    await chrono.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await chrono.getByRole('button', { name: 'Arrivée' }).click()
    await page.waitForTimeout(200)
    await chrono.getByRole('button', { name: 'Arrivée' }).click()
    await chrono.getByRole('button', { name: 'Arrêter' }).click()
    await chrono.getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByLabel('Nom de la course').fill('Replay E2E')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
    await expect(page.getByText('Sauvegardé')).toBeVisible()

    // Naviguer vers le détail puis Replay
    await page.getByRole('link', { name: 'Historique' }).click()
    await page.locator('.historique-item').filter({ hasText: 'Replay E2E' }).click()
    await page.getByRole('button', { name: 'Replay' }).click()
  })

  test('Affiche la piste et le chrono', async ({ page }) => {
    await expect(page.getByRole('region', { name: 'Temps du replay' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Piste virtuelle' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Contrôles de lecture' })).toBeVisible()
  })

  test('Play/Pause fonctionne', async ({ page }) => {
    const playBtn = page.getByRole('region', { name: 'Contrôles de lecture' }).getByRole('button', { name: 'Lecture' })
    const pauseBtn = page.getByRole('region', { name: 'Contrôles de lecture' }).getByRole('button', { name: 'Pause' })

    await playBtn.click()
    await expect(pauseBtn).toBeVisible()
    await page.waitForTimeout(500)
    await pauseBtn.click()
    await expect(playBtn).toBeVisible()
  })

  test('Réinitialiser remet le chrono à zéro', async ({ page }) => {
    const controls = page.getByRole('region', { name: 'Contrôles de lecture' })
    await controls.getByRole('button', { name: 'Lecture' }).click()
    await page.waitForTimeout(400)
    await controls.getByRole('button', { name: 'Réinitialiser' }).click()
    await expect(page.getByRole('region', { name: 'Temps du replay' }).getByRole('timer')).toHaveText(/00:00\.00/)
  })
})
