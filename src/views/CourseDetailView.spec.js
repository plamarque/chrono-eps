import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import CourseDetailView from './CourseDetailView.vue'

const mockLoadCourse = vi.fn()
vi.mock('../services/courseStore.js', () => ({
  loadCourse: (id) => mockLoadCourse(id)
}))

async function mountCourseDetail(courseId) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/historique', name: 'historique', component: { template: '<div/>' } },
      { path: '/historique/:id', name: 'course-detail', component: CourseDetailView }
    ]
  })
  await router.push({ name: 'course-detail', params: { id: courseId } })
  await router.isReady()

  const wrapper = mount(CourseDetailView, {
    global: {
      plugins: [PrimeVue, ToastService, router]
    }
  })

  return { wrapper, router }
}

describe('CourseDetailView', () => {
  beforeEach(() => {
    mockLoadCourse.mockReset()
  })

  it('affiche le bouton Lancer pour une course préparée (sans temps ni passage)', async () => {
    const preparedCourse = {
      id: 'prepared-1',
      nom: 'Équipe du 20 février',
      createdAt: new Date().toISOString(),
      participants: [{ id: 'g1', nom: 'Groupe 1', color: '#ef4444' }],
      passagesByParticipant: {},
      statusAtSave: 'idle',
      mode: 'relay',
      groupStudents: { g1: [{ id: 's1', nom: 'Alice', ordre: 0 }] }
    }
    mockLoadCourse.mockResolvedValue(preparedCourse)

    const { wrapper } = await mountCourseDetail('prepared-1')
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()

    const lancer = wrapper.findAll('button').find((b) => b.text() === 'Lancer')
    expect(lancer.exists()).toBe(true)
    wrapper.unmount()
  })

  it('affiche le bouton Replay pour une course terminée (avec passages)', async () => {
    const completedCourse = {
      id: 'completed-1',
      nom: 'Course du 15 février',
      createdAt: new Date().toISOString(),
      participants: [{ id: 'p1', nom: 'Alice', color: '#3b82f6' }],
      passagesByParticipant: {
        p1: [{ tourNum: 1, lapMs: 60000, totalMs: 60000 }]
      },
      statusAtSave: 'paused',
      mode: 'individual'
    }
    mockLoadCourse.mockResolvedValue(completedCourse)

    const { wrapper } = await mountCourseDetail('completed-1')
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()

    const replay = wrapper.findAll('button').find((b) => b.text() === 'Replay')
    expect(replay.exists()).toBe(true)
    const lancer = wrapper.findAll('button').find((b) => b.text() === 'Lancer')
    expect(lancer).toBeUndefined()
    wrapper.unmount()
  })
})
