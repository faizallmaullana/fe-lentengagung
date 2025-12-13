// src/services/authService.js
import { MOCK_USERS } from '@/mocks/users.js'

// Nanti kalau API udah ada, uncomment ini:
// import axios from 'axios' 

export default {
  // Fungsi Login
  async login(identifier, password) {
    // --- MODE MOCK (SEKARANG) ---
    // Simulasi delay jaringan (loading)
    await new Promise(resolve => setTimeout(resolve, 800))

    // Cari user di file JSON tadi
    const user = MOCK_USERS.find(u => 
      u.nik === String(identifier) && u.password === password
    )

    if (user) {
      return { success: true, data: user, token: 'mock-token-' + user.id }
    } else {
      throw new Error('NIK atau Kata Sandi salah.')
    }

    // --- MODE API (NANTI - GANTINYA GAMPANG) ---
    /*
    try {
      const response = await axios.post('/api/login', { nik: identifier, password })
      return { success: true, data: response.data.user, token: response.data.token }
    } catch (err) {
      throw new Error(err.response.data.message)
    }
    */
  },

  // Fungsi Register
  async register(userData) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simpan ke array mock sementara (agar bisa login)
    // Di real API, ini akan mengirim POST request
    const newUser = {
      ...userData,
      id: Date.now(),
      role: 'masyarakat'
    }
    MOCK_USERS.push(newUser)
    
    return { success: true }
  }
}