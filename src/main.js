import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import router from './router.js'
import 'primeicons/primeicons.css'
import './style.css'

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: { darkModeSelector: 'none' }
  }
})
app.use(ToastService)
app.use(ConfirmationService)
app.use(router)
app.mount('#app')
