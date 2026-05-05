import { test, expect } from '@playwright/test'

const chrono = (page) => page.getByRole('region', { name: 'Chronomètre' })
const btnCoureurChrono = (page) =>
  chrono(page).getByRole('button', {
    name: 'Ajouter un coureur qui passe devant le chronomètre'
  })

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
    await page.getByRole('button', { name: 'Individuel' }).click()
    const ch = chrono(page)
    await ch.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await ch.getByRole('button', { name: 'Arrêter' }).click()
    await ch.getByRole('button', { name: 'Réinitialiser' }).click()
    await expect(page.getByRole('button', { name: 'Oui, effacer' })).toBeVisible()
    await page.getByRole('button', { name: 'Oui, effacer' }).click()
    await expect(ch.getByRole('timer', { name: 'Temps écoulé' })).toHaveText('00:00.00')
  })
})

test.describe('Accueil - Modale Enregistrer', () => {
  test('Champ nom prérempli avec Course du [date] [heure] pour une nouvelle course', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(200)
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    const nomInput = page.getByLabel('Nom de la course')
    await expect(nomInput).toBeVisible()
    const value = await nomInput.inputValue()
    expect(value).toMatch(/^Course du \d{1,2} [a-zéèêëàâäùûüôöîïç]+ \d{2}:\d{2}$/)
  })
})

test.describe('Accueil - Mode individuel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
  })

  test('Coureur 1 par défaut ; bouton Coureur ajoute Coureur 2 puis Coureur 3', async ({ page }) => {
    await expect(page.getByText('Coureur 1')).toBeVisible()
    await btnCoureurChrono(page).click()
    await expect(page.getByText('Coureur 2')).toBeVisible()
    await btnCoureurChrono(page).click()
    await expect(page.getByText('Coureur 3')).toBeVisible()
  })

  test('individuel : après Démarrer, Coureur ajoute C2 sans arrêter C1', async ({ page }) => {
    const part = page.getByRole('region', { name: 'Participants' })
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(400)
    await btnCoureurChrono(page).click()
    const cardC1 = part.locator('.indiv-card').nth(0)
    const cardC2 = part.locator('.indiv-card').nth(1)
    await expect(cardC1.locator('.indiv-tap-btn')).toBeVisible()
    await expect(cardC1.getByText('Temps')).toBeVisible()
    await expect(cardC2).toBeVisible()
    await expect(cardC2.locator('.indiv-tap-btn')).toBeVisible()
    await expect(cardC2.getByText('Temps')).toBeVisible()
  })

  test('individuel : Coureur+ puis Arrêter arrête tous les coureurs encore en course', async ({ page }) => {
    const part = page.getByRole('region', { name: 'Participants' })
    await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(450)
    await btnCoureurChrono(page).click()
    const cardC1 = part.locator('.indiv-card').nth(0)
    const cardC2 = part.locator('.indiv-card').nth(1)
    await expect(cardC1.locator('.indiv-tap-btn')).toBeVisible()
    await expect(cardC2.locator('.indiv-tap-btn')).toBeVisible()

    await page.waitForTimeout(300)
    await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
    await expect(chrono(page).getByRole('button', { name: 'Démarrer' })).toBeVisible()

    await expect(cardC1.locator('.indiv-tap-btn')).not.toBeVisible()
    await expect(cardC2.locator('.indiv-tap-btn')).not.toBeVisible()
    await expect(cardC1.locator('.indiv-total-line')).toBeVisible()
    await expect(cardC2.locator('.indiv-total-line')).toBeVisible()
  })

  test('Sauvegarder une course avec passage', async ({ page }) => {
    const ch = chrono(page)
    await ch.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await ch.getByRole('button', { name: 'Arrêter' }).click()
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
    const ch = chrono(page)
    await ch.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(200)
    await ch.getByRole('button', { name: 'Arrêter' }).click()
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByLabel('Nom de la course').fill('À dupliquer')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
    await expect(page.getByText('Sauvegardé')).toBeVisible()
    await page.getByRole('button', { name: 'Dupliquer' }).click()
    await expect(page.getByText('Coureur 1')).toBeVisible()
    await expect(ch.getByRole('timer', { name: 'Temps écoulé' })).toHaveText('00:00.00')
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

test.describe('Accueil - Navigation', () => {
  test('Vers Historique avec session non enregistrée : Rester annule', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
    const ch = chrono(page)
    await ch.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(200)
    await ch.getByRole('button', { name: 'Arrêter' }).click()
    await page.getByRole('link', { name: 'Historique' }).click()
    await expect(page.getByText('Quitter l\'accueil ?')).toBeVisible()
    await page.getByRole('button', { name: 'Rester' }).click()
    await expect(ch.getByRole('button', { name: 'Réinitialiser' })).toBeVisible()
  })

  test('Vers Historique avec session non enregistrée : Quitter confirme', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Individuel' }).click()
    const ch = chrono(page)
    await ch.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(200)
    await ch.getByRole('button', { name: 'Arrêter' }).click()
    await page.getByRole('link', { name: 'Historique' }).click()
    await expect(page.getByText('Quitter l\'accueil ?')).toBeVisible()
    await page.getByRole('button', { name: 'Quitter' }).click()
    await expect(page.getByText('Historique des courses')).toBeVisible()
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
    const ch = chrono(page)
    await ch.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await ch.getByRole('button', { name: 'Arrêter' }).click()
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
