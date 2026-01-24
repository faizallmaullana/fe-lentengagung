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
  // Persisted simple fields for easy access
  const role = ref(localStorage.getItem('role') || null)
  const name = ref(localStorage.getItem('name') || null)
  const email = ref(localStorage.getItem('email') || null)

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

      console.error('[AuthStore] login response:', response)
      
      // Support different response shapes: { success, data, token } or raw { user, token }
      const accessToken = response?.token ?? response?.access_token
      const userData = response?.data ?? response?.user ?? response
      console.error('[AuthStore] login response:', response)

      if (!accessToken) {
        return { success: false, message: 'Respon server tidak valid.' }
      }

      // Validasi Role (Security Check di Frontend)
      // Mencegah Warga login di halaman Admin, dan sebaliknya
      if (role === 'warga' && userData.role !== 'masyarakat') {
        return { success: false, message: 'Akun ini bukan akun Warga.' }
      }
      if (role === 'admin' && userData.role !== 'petugas') {
        return { success: false, message: 'Akun ini bukan akun Petugas.' }
      }

      // Extract simple fields
      const extractedRole = userData?.role ?? userData?.profile?.role ?? null
      const extractedEmail = userData?.email ?? null
      const extractedName = userData?.profile?.name ?? userData?.name ?? null

      // Jika lolos, simpan sesi (simpan juga role, name, email terpisah)
      _setSession(accessToken, userData, { role: extractedRole, name: extractedName, email: extractedEmail })
      return { success: true }

    } catch (error) {
      // Tangkap error dari service (misal: password salah)
      return { success: false, message: error.message || 'Gagal login.' }
    }
  }

  // 2. LOGIKA REGISTER (Sekarang pakai Service)
  const register = async (formData) => {
    try {
      const response = await authServices.register(formData)
      console.log(response)
      // Normalize possible response shapes so callers can rely on { success, ... }
      if (response && (response.success === true || response.approvalToken || response.token)) {
        return { success: true, ...response }
      }
      if (response === true) return { success: true }
      // Fallback: return success with data container
      return { success: true, data: response }
    } catch (error) {
      console.log(error)
      return { success: false, message: error.message || 'Gagal mendaftar.' }
    }
  }

  // 3. LOGIKA LOGOUT
  const logout = () => {
    token.value = null
    user.value = null
    loginTime.value = null 
    role.value = null
    name.value = null
    email.value = null

    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('loginTime') 
    localStorage.removeItem('role')
    localStorage.removeItem('name')
    localStorage.removeItem('email')
  }

  // Helper Private
  const _setSession = (newToken, newUser, extras = {}) => {
    token.value = newToken
    user.value = newUser

    // set simple fields if provided or derive from user
    role.value = extras.role ?? newUser?.role ?? newUser?.profile?.role ?? null
    name.value = extras.name ?? newUser?.profile?.name ?? newUser?.name ?? null
    email.value = extras.email ?? newUser?.email ?? null

    const now = new Date().getTime()
    loginTime.value = now

    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    localStorage.setItem('loginTime', now)
    if (role.value) localStorage.setItem('role', role.value)
    if (name.value) localStorage.setItem('name', name.value)
    if (email.value) localStorage.setItem('email', email.value)
  }

  // UI helper: hide dashboard for masyarakat
  const showDashboard = computed(() => {
    return isAuthenticated.value && (role.value !== 'masyarakat')
  })

  return { 
    token, 
    user, 
    isAuthenticated, 
    isAdmin, 
    role,
    name,
    email,
    showDashboard,
    login,
    register,
    logout 
  }
})