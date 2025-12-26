// src/services/authServices.js
import { MOCK_USERS } from '@/mocks/users.js'
import { apiPost } from '@/axios'

// Toggle mock mode via env: VITE_USE_MOCK = 'true'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  // Login returns { success: true, data: user, token }
  async login(identifier, password) {
    // Mock mode for local development
    if (USE_MOCK) {
      await new Promise((res) => setTimeout(res, 800))
      const user = MOCK_USERS.find(
        (u) => u.nik === String(identifier) && u.password === password
      )
      if (user) {
        return { success: true, data: user, token: 'mock-token-' + user.id }
      }
      throw new Error('NIK atau Kata Sandi salah.')
    }

    // Real API mode
    try {
      const res = await apiPost('/auth/login', { nik: identifier, password })
      // Expecting response like { user: {...}, token: '...' } or similar
      const user = res.user || res.data?.user || res
      const token = res.token || res.data?.token
      if (!user || !token) throw new Error('Invalid response from server.')
      return { success: true, data: user, token }
    } catch (err) {
      throw new Error(err.message || 'Gagal melakukan login')
    }
  },

  // Register returns { success: true } on success
  async register(userData) {
    if (USE_MOCK) {
      await new Promise((res) => setTimeout(res, 1000))
      const newUser = { ...userData, id: Date.now(), role: 'masyarakat' }
      MOCK_USERS.push(newUser)
      return { success: true }
    }

    try {
      await apiPost('/auth/register', userData)
      return { success: true }
    } catch (err) {
      throw new Error(err.message || 'Gagal mendaftar')
    }
  }
}
