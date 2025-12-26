import { createApp } from 'vue'
import App from './App.vue'
import './style.css' // tailwindcss update
import { createPinia } from 'pinia' // pinia update 
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)

app.mount('#app')
