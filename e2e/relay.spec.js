import { test, expect } from '@playwright/test'

const chrono = (page) => page.getByRole('region', { name: 'Chronomètre' })
const participants = (page) => page.getByRole('region', { name: 'Participants' })

test.describe('Mode relais', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Mode relais par défaut ; Groupe 1 avec Coureur 1
  })

  test('Affiche Groupe 1 par défaut', async ({ page }) => {
    await expect(page.getByText('Groupe 1')).toBeVisible()
  })

  test('Ajouter un groupe affiche Groupe 2', async ({ page }) => {
    await participants(page).getByRole('button', { name: 'Ajouter' }).click()
    await expect(page.getByText('Groupe 2')).toBeVisible()
  })

  test('Démarrer, enregistrer un passage, arrêter', async ({ page }) => {
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await participants(page).getByRole('button', { name: 'Enregistrer passage' }).first().click()
    await page.waitForTimeout(200)
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await expect(participants(page).getByText(/Couru|Prochain/).first()).toBeVisible()
  })

  test('Sauvegarder une course relais', async ({ page }) => {
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await participants(page).getByRole('button', { name: 'Enregistrer passage' }).first().click()
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await chrono(page).getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByLabel('Nom de la course').fill('Relais E2E')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
    await expect(page.getByText('Sauvegardé')).toBeVisible()
  })

  test('Config groupe : ajouter un coureur puis le supprimer', async ({ page }) => {
    await page.locator('.tableau-relay-body-clickable').first().click()
    await expect(page.getByRole('dialog').getByText('Configurer Groupe 1')).toBeVisible()
    await page.getByRole('button', { name: 'Ajouter un coureur' }).click()
    await expect(page.getByRole('button', { name: 'Supprimer Coureur 2' })).toBeVisible()
    await page.getByRole('button', { name: 'Supprimer Coureur 2' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer' }).click()
    await expect(page.getByRole('button', { name: 'Supprimer Coureur 2' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /Supprimer Coureur/ })).not.toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer' }).last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('Config groupe : boutons suppr. masqués quand le groupe a des passages', async ({ page }) => {
    await page.locator('.tableau-relay-body-clickable').first().click()
    await page.getByRole('button', { name: 'Ajouter un coureur' }).click()
    await page.getByRole('button', { name: 'Enregistrer' }).last().click()
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await participants(page).getByRole('button', { name: 'Enregistrer passage' }).first().click()
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await page.locator('.tableau-relay-body-clickable').first().click()
    await expect(page.getByRole('dialog').getByText('Configurer Groupe 1')).toBeVisible()
    await expect(page.getByRole('button', { name: /Supprimer Coureur/ })).not.toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer' }).last().click()
  })
})
