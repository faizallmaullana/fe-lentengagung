<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import logoUrl from '@/assets/images/logo.png'
import loginBg from '@/assets/images/login-bg.png'
import Swal from 'sweetalert2'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('warga')
const isLoading = ref(false)
const formData = ref({ identifier: '', password: '' })

const handleLogin = async () => {
  isLoading.value = true

  try {
    const result = await authStore.login(
      formData.value.identifier,
      formData.value.password,
      activeTab.value
    )

    console.debug('[LOGIN] login result:', result)

    if (result.success) {
      // 1. TOAST SUKSES (Pojok Kanan Atas)
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      })

      Toast.fire({
        icon: 'success',
        title: `Selamat Datang, ${activeTab.value === 'warga' ? 'Warga' : 'Petugas'}!`
      })

      console.warn(result)

      // Save auth token if provided by backend
      const authToken = result.data?.access_token
      if (authToken) {
        console.debug('[LoginView] saving authToken to localStorage')
        localStorage.setItem('authToken', authToken)
      }

      // Redirect
      if (activeTab.value === 'warga') {
        router.push('/dashboard/pengajuan') 
      } else {
        router.push('/admin/antrian')
      }
    } else {
      // 2. POPUP ERROR (Tengah)
      console.warn('[LoginView] login failed:', result)
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: result.message || 'Periksa kembali NIK dan Password Anda.',
        confirmButtonColor: '#d33',
        confirmButtonText: 'Coba Lagi'
      })
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Kesalahan Sistem',
      text: 'Terjadi gangguan koneksi. Silakan coba lagi nanti.',
    })
  } finally {
    isLoading.value = false
  }
}

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div 
    class="min-h-screen flex items-center justify-center px-4 bg-cover bg-center relative"
    :style="{ backgroundImage: `url(${loginBg})` }"
  >
    <div class="absolute inset-0 bg-slate-900/50"></div>
    
    <div class="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-100 relative z-10">
      
      <div class="p-6 text-center relative">
        <button 
          @click="goHome" 
          class="absolute left-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
          title="Kembali ke Beranda"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>

        <img :src="logoUrl" alt="Logo" class="h-12 w-auto mx-auto mb-3" />
        <h2 class="text-xl font-bold text-slate-800">Selamat Datang</h2>
        <p class="text-sm text-slate-500">Silakan masuk untuk melanjutkan</p>
      </div>

      <div class="flex border-b border-slate-100 bg-slate-50/50">
        <button 
          class="flex-1 py-3 text-sm font-medium transition-all border-b-2"
          :class="activeTab === 'warga' 
            ? 'text-green-700 border-green-600 bg-white shadow-sm' 
            : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100'"
          @click="activeTab = 'warga'" 
        >
          Warga
        </button>
        <button 
          class="flex-1 py-3 text-sm font-medium transition-all border-b-2"
          :class="activeTab === 'admin' 
            ? 'text-blue-700 border-blue-600 bg-white shadow-sm' 
            : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100'"
          @click="activeTab = 'admin'"
        >
          Admin / Petugas
        </button>
      </div>

      <div class="p-8">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              {{ activeTab === 'warga' ? 'NIK (Nomor Induk Kependudukan)' : 'Username / NIP' }}
            </label>
            <input 
              v-model="formData.identifier"
              :type="activeTab === 'warga' ? 'number' : 'text'"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none transition-all disabled:bg-slate-100"
              :class="activeTab === 'warga' ? 'focus:ring-green-200 focus:border-green-500' : 'focus:ring-blue-200 focus:border-blue-500'"
              :placeholder="activeTab === 'warga' ? 'Contoh: 31740...' : 'Masukkan username petugas'"
              required
              :disabled="isLoading"
            />
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-sm font-medium text-slate-700">Kata Sandi</label>
              <a href="#" class="text-xs text-slate-400 hover:text-slate-600" tabindex="-1">Lupa sandi?</a>
            </div>
            <input 
              v-model="formData.password"
              type="password" 
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none transition-all disabled:bg-slate-100"
              :class="activeTab === 'warga' ? 'focus:ring-green-200 focus:border-green-500' : 'focus:ring-blue-200 focus:border-blue-500'"
              placeholder="••••••••"
              required
              :disabled="isLoading"
            />
          </div>

          <button 
            type="submit"
            :disabled="isLoading"
            class="w-full py-2.5 px-4 text-white font-semibold rounded-lg shadow-md transition-all transform focus:ring-2 focus:ring-offset-1 cursor-pointer flex justify-center items-center gap-2"
            :class="[
              activeTab === 'warga' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
              isLoading ? 'opacity-70 cursor-not-allowed hover:transform-none' : 'hover:-translate-y-0.5'
            ]"
          >
            <svg v-if="isLoading" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            
            {{ isLoading ? 'Memproses...' : `Masuk sebagai ${activeTab === 'warga' ? 'Warga' : 'Admin'}` }}
          </button>
        </form>

        <div v-if="activeTab === 'warga'" class="mt-6 text-center text-sm text-slate-600">
          Belum punya akun? 
          <RouterLink to="/register" class="text-green-600 font-semibold hover:underline">
            Daftar sekarang
          </RouterLink>
        </div>
      </div>

    </div>
  </div>
</template>