import { test, expect } from '@playwright/test'

test.describe('Invitation testeur Play', () => {
  test('la page devenir-testeur pointe vers l’opt-in Play', async ({ page }) => {
    await page.goto('/chrono-eps/devenir-testeur')
    await expect(page.getByRole('heading', { name: 'Devenir testeur Android' })).toBeVisible()
    const link = page.getByRole('link', { name: /S’inscrire sur Google Play/ })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute(
      'href',
      'https://play.google.com/apps/testing/io.github.plamarque.twa'
    )
    await expect(page.getByRole('link', { name: 'Rejoindre le groupe' })).toHaveAttribute(
      'href',
      'https://groups.google.com/g/chrono-eps-testers'
    )
  })

  test('la fenêtre d’invitation apparaît avec ?invitePlay=1', async ({ page }) => {
    await page.goto('/?invitePlay=1')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Tester Chrono EPS sur Android')).toBeVisible()
    await page.getByRole('button', { name: 'S’inscrire' }).click()
    await expect(page).toHaveURL(/devenir-testeur/)
  })
})
