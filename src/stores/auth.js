import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  // --- STATE ---
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  
  // [BARU] Simpan waktu login terakhir (Timestamp)
  // Diperlukan untuk mengecek durasi sesi (SRS SE.AU.3)
  const loginTime = ref(localStorage.getItem('loginTime') || null)

  // Variable sementara untuk menampung user yang baru Register (Mock)
  const registeredUsers = ref([]) 

  // --- GETTERS ---
  const isAuthenticated = computed(() => {
    // 1. Cek apakah token ada
    if (!token.value) return false

    // 2. [BARU] Cek Session Timeout (15 Menit = 900.000 ms)
    if (loginTime.value) {
      const now = new Date().getTime()
      const expiryTime = 15 * 60 * 1000 // 15 Menit sesuai SRS
      const lastLogin = parseInt(loginTime.value)

      // Jika selisih waktu sekarang dan login > 15 menit
      if (now - lastLogin > expiryTime) {
        logout() // Hapus sesi
        alert("Sesi Anda telah berakhir (15 menit tidak aktif). Silakan login kembali.")
        return false
      }
    }
    
    return true
  })

  const isAdmin = computed(() => user.value?.role === 'petugas')

  // --- ACTIONS ---

  // 1. LOGIKA LOGIN
  const login = async (identifier, password, role) => {
    // Simulasi loading
    await new Promise(resolve => setTimeout(resolve, 800))

    // Konversi input ke String untuk keamanan tipe data
    const strIdentifier = String(identifier).trim()
    const strPassword = String(password)

    // --- SKENARIO WARGA ---
    if (role === 'warga') {
      // Cek User Hardcode (Sesuai request Anda: pass 'pw')
      if (strIdentifier === '12345678' && strPassword === 'pw') {
        const mockUser = { 
          id: 1, 
          name: 'Agung Santoso', 
          email: 'agung@warga.com', 
          role: 'masyarakat', // Role sesuai SRS
          nik: '12345678' 
        }
        _setSession('mock-token-warga-fixed', mockUser)
        return { success: true }
      }

      // Cek User hasil Register (Mock)
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
      // Hardcode Admin (Sesuai request Anda: pass 'adm')
      if (strIdentifier === 'admin' && strPassword === 'adm') {
        const mockUser = { 
          id: 99, 
          name: 'Petugas Kelurahan', 
          role: 'petugas' // Role sesuai SRS
        }
        _setSession('mock-token-admin', mockUser)
        return { success: true }
      }
    }

    // Gagal Login
    return { success: false, message: 'NIK/Username atau Kata Sandi salah.' }
  }

  // 2. LOGIKA REGISTER
  const register = async (formData) => {
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Simpan ke memori sementara (Mock DB)
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
    // Reset State
    token.value = null
    user.value = null
    loginTime.value = null // Reset waktu

    // Hapus dari LocalStorage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('loginTime') // Bersihkan jejak waktu
  }

  // Helper Private: Menyimpan Sesi & Waktu
  const _setSession = (newToken, newUser) => {
    token.value = newToken
    user.value = newUser
    
    // [BARU] Catat waktu login saat ini
    const now = new Date().getTime()
    loginTime.value = now

    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    localStorage.setItem('loginTime', now) // Simpan timestamp
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