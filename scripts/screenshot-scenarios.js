/**
 * Scénarios de capture pour les screenshots stores.
 * Chaque setup reproduit la logique des E2E pour atteindre l'état souhaité.
 */

const chrono = (page) => page.getByRole('region', { name: 'Chronomètre' })
const participants = (page) => page.getByRole('region', { name: 'Participants' })
const btnCoureurChrono = (page) =>
  chrono(page).getByRole('button', {
    name: 'Ajouter un coureur qui passe devant le chronomètre'
  })

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/** @type {Array<{ id: string, setup: (page: import('@playwright/test').Page) => Promise<void> }>} */
export const SCENARIOS = [
  {
    id: 'relais',
    setup: async (page) => {
      await page.goto('/')
      // 5 groupes (1 par défaut + 4 ajoutés)
      for (let i = 0; i < 4; i++) {
        await participants(page).getByRole('button', { name: 'Ajouter' }).click()
        await delay(100)
      }
      await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
      await delay(300)
      for (let i = 0; i < 5; i++) {
        await participants(page).getByRole('button', { name: 'Enregistrer passage' }).nth(i).click()
        await delay(400)
      }
      // Laisser la course tourner quelques secondes (coureurs répartis sur la piste)
      await delay(4000)
      await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
      await delay(300)
    },
  },
  {
    id: 'indiv',
    setup: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Individuel' }).click()
      // 12 cartes : Coureur 1 par défaut + 11 ajouts (bouton Coureur zone chronomètre)
      for (let i = 0; i < 11; i++) {
        await btnCoureurChrono(page).click()
        await delay(120)
      }
      await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
      await delay(300)
      await delay(800)
      await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
      await delay(300)
    },
  },
  {
    id: 'indiv-enregistrer',
    setup: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Individuel' }).click()
      await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
      await delay(300)
      await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
      await chrono(page).getByRole('button', { name: 'Enregistrer' }).click()
      await delay(300)
    },
  },
  {
    id: 'indiv-eleve',
    setup: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Individuel' }).click()
      await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
      await delay(300)
      await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
      await delay(300)
    },
  },
  {
    id: 'historique',
    setup: async (page) => {
      const courses = [
        { nom: '2x500m - Terminale 1', relay: true },
        { nom: '1500m - Second B', relay: false },
        { nom: 'Cross 2km - Epreuve', relay: false },
        { nom: 'Relais 4x100m - 3e', relay: true },
        { nom: 'Demi-fond 800m - Première', relay: false },
      ]
      for (let c = 0; c < courses.length; c++) {
        const { nom, relay } = courses[c]
        await page.goto('/')
        if (relay) {
          for (let i = 0; i < 4; i++) {
            await participants(page).getByRole('button', { name: 'Ajouter' }).click()
            await delay(80)
          }
          await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
          await delay(300)
          for (let i = 0; i < 5; i++) {
            await participants(page).getByRole('button', { name: 'Enregistrer passage' }).nth(i).click()
            await delay(150)
          }
          await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
        } else {
          await page.getByRole('button', { name: 'Individuel' }).click()
          await delay(200)
          await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
          await delay(300)
          await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
        }
        await chrono(page).getByRole('button', { name: 'Enregistrer' }).click()
        await page.getByLabel('Nom de la course').fill(nom)
        await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
        await page.getByText('Sauvegardé').waitFor({ state: 'visible' })
        if (c < courses.length - 1) {
          await page.getByRole('button', { name: 'Nouvelle course' }).click()
          await page.getByRole('button', { name: 'Continuer' }).click()
          await delay(300)
        }
      }
      await page.getByRole('link', { name: 'Historique' }).click()
      await delay(500)
    },
  },
  {
    id: 'groupe',
    setup: async (page) => {
      await page.goto('/')
      for (let i = 0; i < 4; i++) {
        await participants(page).getByRole('button', { name: 'Ajouter' }).click()
        await delay(100)
      }
      await page.locator('.tableau-relay-body-clickable').first().click()
      await page.getByRole('dialog').getByText('Configurer Groupe 1').waitFor({ state: 'visible' })
      await page.getByRole('button', { name: 'Ajouter un coureur' }).click()
      await delay(200)
    },
  },
  {
    id: 'groupe-perf',
    setup: async (page) => {
      await page.goto('/')
      for (let i = 0; i < 4; i++) {
        await participants(page).getByRole('button', { name: 'Ajouter' }).click()
        await delay(100)
      }
      await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
      await delay(300)
      for (let i = 0; i < 5; i++) {
        await participants(page).getByRole('button', { name: 'Enregistrer passage' }).nth(i).click()
        await delay(200)
      }
      await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
      await delay(300)
    },
  },
  {
    id: 'indiv-course',
    setup: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Individuel' }).click()
      for (let i = 0; i < 11; i++) {
        await btnCoureurChrono(page).click()
        await delay(400)
      }
      await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
      await delay(400)
      await delay(4000)
      await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
      await delay(300)
    },
  },
  {
    id: 'course',
    setup: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Individuel' }).click()
      await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
      await delay(300)
      await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
      await chrono(page).getByRole('button', { name: 'Enregistrer' }).click()
      await page.getByLabel('Nom de la course').fill('1500m - Second B')
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
      await page.getByText('Sauvegardé').waitFor({ state: 'visible' })
      await page.getByRole('link', { name: 'Historique' }).click()
      await page.locator('.historique-item').filter({ hasText: '1500m - Second B' }).first().click()
      await page.getByRole('button', { name: 'Exporter' }).waitFor({ state: 'visible' })
      // S'assurer que chrono + Replay + Exporter sont visibles (section peut être coupée sur petits écrans)
      await page.locator('section[aria-labelledby="course-detail-chrono-heading"]').scrollIntoViewIfNeeded()
      await delay(300)
    },
  },
  {
    id: 'replay',
    setup: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Individuel' }).click()
      // 6 coureurs : Coureur 1 par défaut + 5 ajouts (bouton Coureur sous le chrono)
      for (let i = 0; i < 5; i++) {
        await btnCoureurChrono(page).click()
        await delay(400)
      }
      await chrono(page).getByRole('button', { name: 'Démarrer' }).click()
      await delay(300)
      await chrono(page).getByRole('button', { name: 'Arrêter' }).click()
      await chrono(page).getByRole('button', { name: 'Enregistrer' }).click()
      await page.getByLabel('Nom de la course').fill('Cross 2km - Epreuve')
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).last().click()
      await page.getByText('Sauvegardé').waitFor({ state: 'visible' })
      await page.getByRole('link', { name: 'Historique' }).click()
      await page.locator('.historique-item').filter({ hasText: 'Cross 2km - Epreuve' }).first().click()
      await page.getByRole('button', { name: 'Replay' }).click()
      await delay(500)
      // requestAnimationFrame throttled en headless → ?t= pour seek direct (évite rAF)
      const url = new URL(page.url())
      url.searchParams.set('t', '2500')
      await page.goto(url.toString())
      await delay(300)
    },
  },
]
