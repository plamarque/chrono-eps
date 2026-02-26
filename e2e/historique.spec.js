import { test, expect } from '@playwright/test'

test.describe('Historique', () => {
  test('Liste vide affiche Créer une course', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.goto('http://localhost:4174/chrono-eps/historique')
      await expect(page.getByText('Historique des courses')).toBeVisible()
      await expect(page.getByRole('link', { name: /Créer une course/ })).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('Affiche les courses sauvegardées et ouvre le détail', async ({ page }) => {
    // Créer une course depuis l'accueil
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
    const chrono = page.getByRole('region', { name: 'Chronomètre' })
    await chrono.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Marquer passage' }).first().click()
    await chrono.getByRole('button', { name: 'Arrêter' }).click()
    await chrono.getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByLabel('Nom de la course').fill('Course Historique E2E')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
    await expect(page.getByText('Sauvegardé')).toBeVisible()

    // Aller à l'historique
    await page.getByRole('link', { name: 'Historique' }).click()
    await expect(page.locator('.historique-item').filter({ hasText: 'Course Historique E2E' })).toBeVisible()

    // Cliquer sur la course pour ouvrir le détail
    await page.locator('.historique-item').filter({ hasText: 'Course Historique E2E' }).click()
    await expect(page.getByText('Course Historique E2E').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Replay' })).toBeVisible()
  })

  test('Supprimer une course', async ({ page }) => {
    // Créer une course
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
    const chrono = page.getByRole('region', { name: 'Chronomètre' })
    await chrono.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Marquer passage' }).first().click()
    await chrono.getByRole('button', { name: 'Arrêter' }).click()
    await chrono.getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByLabel('Nom de la course').fill('À supprimer')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
    await expect(page.getByText('Sauvegardé')).toBeVisible()

    await page.getByRole('link', { name: 'Historique' }).click()
    await expect(page.locator('.historique-item').filter({ hasText: 'À supprimer' })).toBeVisible()

    // Accepter la boîte de confirmation native
    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('.historique-item').filter({ hasText: 'À supprimer' }).getByRole('button', { name: 'Supprimer' }).click()

    await expect(page.locator('.historique-item').filter({ hasText: 'À supprimer' })).not.toBeVisible()
  })

  test.describe('Export', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'canShare', {
          value: (data) => !(data?.files?.length),
          configurable: true
        })
      })
    })

    test('Exporter depuis la liste déclenche le téléchargement', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Individuel' }).click()
      const chrono = page.getByRole('region', { name: 'Chronomètre' })
      await chrono.getByRole('button', { name: 'Démarrer' }).click()
      await page.waitForTimeout(200)
      await page.getByRole('button', { name: 'Marquer passage' }).first().click()
      await chrono.getByRole('button', { name: 'Arrêter' }).click()
      await chrono.getByRole('button', { name: 'Enregistrer' }).click()
      await page.getByLabel('Nom de la course').fill('Course export liste E2E')
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
      await expect(page.getByText('Sauvegardé')).toBeVisible()

      await page.getByRole('link', { name: 'Historique' }).click()
      const item = page.locator('.historique-item').filter({ hasText: 'Course export liste E2E' })
      await expect(item).toBeVisible()

      const downloadPromise = page.waitForEvent('download')
      await item.getByRole('button', { name: 'Exporter' }).click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
      expect(download.suggestedFilename()).toContain('Course_export_liste_E2E')
    })

    test('Exporter depuis la vue détail déclenche le téléchargement', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Individuel' }).click()
      const chrono = page.getByRole('region', { name: 'Chronomètre' })
      await chrono.getByRole('button', { name: 'Démarrer' }).click()
      await page.waitForTimeout(200)
      await page.getByRole('button', { name: 'Marquer passage' }).first().click()
      await chrono.getByRole('button', { name: 'Arrêter' }).click()
      await chrono.getByRole('button', { name: 'Enregistrer' }).click()
      await page.getByLabel('Nom de la course').fill('Course export detail E2E')
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
      await expect(page.getByText('Sauvegardé')).toBeVisible()

      await page.getByRole('link', { name: 'Historique' }).click()
      await page.locator('.historique-item').filter({ hasText: 'Course export detail E2E' }).click()
      await expect(page.getByRole('button', { name: 'Exporter' })).toBeVisible()

      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exporter' }).click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
      expect(download.suggestedFilename()).toContain('Course_export_detail_E2E')
    })
  })
})
