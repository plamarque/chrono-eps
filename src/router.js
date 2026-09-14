import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import HistoriqueView from './views/HistoriqueView.vue'
import CourseDetailView from './views/CourseDetailView.vue'
import ReplayView from './views/ReplayView.vue'
import DevenirTesteurView from './views/DevenirTesteurView.vue'

const router = createRouter({
  history: createWebHistory('/chrono-eps/'),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/historique', name: 'historique', component: HistoriqueView },
    { path: '/historique/:id', name: 'course-detail', component: CourseDetailView },
    { path: '/historique/:id/replay', name: 'course-replay', component: ReplayView },
    { path: '/devenir-testeur', name: 'devenir-testeur', component: DevenirTesteurView }
  ]
})

export default router
