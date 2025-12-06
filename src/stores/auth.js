import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
// [BARU] Import SweetAlert2
import Swal from 'sweetalert2'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  // --- STATE ---
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  
  // Simpan waktu login terakhir (Timestamp)
  const loginTime = ref(localStorage.getItem('loginTime') || null)

  // Variable sementara untuk menampung user yang baru Register (Mock)
  const registeredUsers = ref([]) 

  // --- GETTERS ---
  const isAuthenticated = computed(() => {
    // 1. Cek apakah token ada
    if (!token.value) return false

    // 2. Cek Session Timeout (15 Menit = 900.000 ms)
    if (loginTime.value) {
      const now = new Date().getTime()
      const expiryTime = 15 * 60 * 1000 // 15 Menit sesuai SRS
      const lastLogin = parseInt(loginTime.value)

      // Jika selisih waktu sekarang dan login > 15 menit
      if (now - lastLogin > expiryTime) {
        logout() // Hapus sesi
        
        // [UPDATED] Menggunakan SweetAlert2 pengganti alert()
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

  // 1. LOGIKA LOGIN
  const login = async (identifier, password, role) => {
    await new Promise(resolve => setTimeout(resolve, 800))

    const strIdentifier = String(identifier).trim()
    const strPassword = String(password)

    // --- SKENARIO WARGA ---
    if (role === 'warga') {
      if (strIdentifier === '12345678' && strPassword === 'pw') {
        const mockUser = { 
          id: 1, 
          name: 'Agung Santoso', 
          email: 'agung@warga.com', 
          role: 'masyarakat', 
          nik: '12345678' 
        }
        _setSession('mock-token-warga-fixed', mockUser)
        return { success: true }
      }

      const foundUser = registeredUsers.value.find(u => u.nik === strIdentifier && u.password === strPassword)
      if (foundUser) {
        const mockUser = { 
          id: Date.now(), 
          name: 'Warga Baru', 
          email: foundUser.email, 
          role: 'masyarakat', 
          nik: foundUser.nik 
        }
        _setSession('mock-token-warga-registered', mockUser)
        return { success: true }
      }
    } 
    
    // --- SKENARIO ADMIN ---
    else if (role === 'admin') {
      if (strIdentifier === 'admin' && strPassword === 'adm') {
        const mockUser = { 
          id: 99, 
          name: 'Petugas Kelurahan', 
          role: 'petugas' 
        }
        _setSession('mock-token-admin', mockUser)
        return { success: true }
      }
    }

    return { success: false, message: 'NIK/Username atau Kata Sandi salah.' }
  }

  // 2. LOGIKA REGISTER
  const register = async (formData) => {
    await new Promise(resolve => setTimeout(resolve, 1000))

    registeredUsers.value.push({
      nik: String(formData.nik),
      password: formData.password,
      email: formData.email,
      phone: formData.phone
    })

    console.log('User baru tersimpan di memori sementara:', registeredUsers.value)
    return { success: true }
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