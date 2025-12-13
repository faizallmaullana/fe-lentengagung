import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
// [BARU] Import Service
import authServices from '@/services/authServices'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  // --- STATE ---
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const loginTime = ref(localStorage.getItem('loginTime') || null)

  // --- GETTERS ---
  const isAuthenticated = computed(() => {
    // 1. Cek keberadaan token
    if (!token.value) return false

    // 2. Cek Session Timeout (15 Menit)
    if (loginTime.value) {
      const now = new Date().getTime()
      const expiryTime = 15 * 60 * 1000 
      const lastLogin = parseInt(loginTime.value)

      if (now - lastLogin > expiryTime) {
        logout() // Hapus sesi
        
        Swal.fire({
          icon: 'warning',
          title: 'Sesi Berakhir',
          text: 'Anda tidak aktif selama 15 menit. Silakan login kembali.',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Login Ulang',
          allowOutsideClick: false,
          allowEscapeKey: false
        })
        return false
      }
    }
    return true
  })

  const isAdmin = computed(() => user.value?.role === 'petugas')

  // --- ACTIONS ---

  // 1. LOGIKA LOGIN (Sekarang pakai Service)
  const login = async (identifier, password, role) => {
    try {
      // Panggil Service (Pelayan)
      const response = await authServices.login(identifier, password)
      const userData = response.data

      // Validasi Role (Security Check di Frontend)
      // Mencegah Warga login di halaman Admin, dan sebaliknya
      if (role === 'warga' && userData.role !== 'masyarakat') {
        return { success: false, message: 'Akun ini bukan akun Warga.' }
      }
      if (role === 'admin' && userData.role !== 'petugas') {
        return { success: false, message: 'Akun ini bukan akun Petugas.' }
      }

      // Jika lolos, simpan sesi
      _setSession(response.token, userData)
      return { success: true }

    } catch (error) {
      // Tangkap error dari service (misal: password salah)
      return { success: false, message: error.message }
    }
  }

  // 2. LOGIKA REGISTER (Sekarang pakai Service)
  const register = async (formData) => {
    try {
      await authService.register(formData)
      return { success: true }
    } catch (error) {
      return { success: false, message: 'Gagal mendaftar.' }
    }
  }

  // 3. LOGIKA LOGOUT
  const logout = () => {
    token.value = null
    user.value = null
    loginTime.value = null 

    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('loginTime') 
  }

  // Helper Private
  const _setSession = (newToken, newUser) => {
    token.value = newToken
    user.value = newUser
    
    const now = new Date().getTime()
    loginTime.value = now

    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    localStorage.setItem('loginTime', now) 
  }

  return { 
    token, 
    user, 
    isAuthenticated, 
    isAdmin, 
    login, 
    register, 
    logout 
  }
})