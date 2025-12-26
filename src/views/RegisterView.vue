<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import logoUrl from '@/assets/images/logo.png'
import loginBg from '@/assets/images/login-bg.png'
import Swal from 'sweetalert2'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const formData = ref({
  nik: '', email: '', phone: '', password: '', confirmPassword: ''
})

const handleRegister = async () => {
  // 1. Validasi Password dengan Popup Warning
  if (formData.value.password !== formData.value.confirmPassword) {
    Swal.fire({
      icon: 'warning',
      title: 'Password Tidak Cocok',
      text: 'Pastikan konfirmasi kata sandi sama dengan kata sandi.',
      confirmButtonColor: '#f59e0b'
    })
    return
  }

  // 2. Validasi NIK (16 digit)
  if (String(formData.value.nik).length !== 16) {
    Swal.fire({
      icon: 'warning',
      title: 'NIK Tidak Valid',
      text: 'NIK harus terdiri dari 16 digit angka.',
      confirmButtonColor: '#f59e0b'
    })
    return
  }

  // 3. Validasi Panjang Password
  if (formData.value.password.length < 8) {
    Swal.fire({
      icon: 'warning',
      title: 'Kata Sandi Terlalu Pendek',
      text: 'Kata sandi minimal 8 karakter.',
      confirmButtonColor: '#f59e0b'
    })
    return
  }
  
  isLoading.value = true

  try {
    // Build a clean JSON payload (exclude confirmPassword)
    const payload = {
      nik: String(formData.value.nik),
      email: String(formData.value.email),
      phone: String(formData.value.phone),
      password: formData.value.password
    }

    const result = await authStore.register(payload)
    
    if (result.success) {
      // 4. Popup Sukses Besar
      await Swal.fire({
        icon: 'success',
        title: 'Pendaftaran Berhasil!',
        text: 'Akun Anda telah dibuat. Silakan login menggunakan NIK Anda.',
        confirmButtonText: 'Lanjut ke Login',
        confirmButtonColor: '#16a34a'
      })
      router.push('/login')
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mendaftar',
        text: result.message || 'Terjadi kesalahan saat mendaftar.',
      })
    }
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'System Error',
      text: err?.message || 'Gagal menghubungi server.',
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
    class="min-h-screen flex items-center justify-center px-4 bg-cover bg-center relative py-10"
    :style="{ backgroundImage: `url(${loginBg})` }"
  >
    <div class="absolute inset-0 bg-slate-900/50"></div>
    
    <div class="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-100 relative z-10">
      
      <div class="p-6 text-center relative border-b border-slate-100">
        <button 
          @click="goHome" 
          class="absolute left-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
          title="Kembali ke Beranda"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>

        <img :src="logoUrl" alt="Logo" class="h-10 w-auto mx-auto mb-3" />
        <h2 class="text-xl font-bold text-slate-800">Pendaftaran Warga</h2>
        <p class="text-sm text-slate-500">Buat akun untuk mengajukan surat waris</p>
      </div>

      <div class="p-8">
        <form @submit.prevent="handleRegister" class="space-y-4">
          
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">NIK (Nomor Induk Kependudukan)</label>
            <input 
              v-model="formData.nik"
              type="text" 
              inputmode="numeric"
              pattern="\d*"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-all disabled:bg-slate-100"
              placeholder="16 digit NIK tertera di KTP"
              required
              :disabled="isLoading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Alamat Email</label>
            <input 
              v-model="formData.email"
              type="email" 
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-all disabled:bg-slate-100"
              placeholder="contoh@email.com"
              required
              :disabled="isLoading"
            />
            <p class="text-xs text-slate-400 mt-1">Digunakan untuk notifikasi status & pemulihan akun.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
            <input 
              v-model="formData.phone"
              type="tel" 
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-all disabled:bg-slate-100"
              placeholder="Contoh: 08123456789"
              required
              :disabled="isLoading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Kata Sandi</label>
            <input 
              v-model="formData.password"
              type="password" 
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-all disabled:bg-slate-100"
              placeholder="Minimal 8 karakter"
              required
              minlength="8"
              :disabled="isLoading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Ulangi Kata Sandi</label>
            <input 
              v-model="formData.confirmPassword"
              type="password" 
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-all disabled:bg-slate-100"
              placeholder="Masukkan ulang kata sandi"
              required
              :disabled="isLoading"
            />
          </div>

          <button 
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-all transform focus:ring-2 focus:ring-offset-1 focus:ring-green-500 mt-2 cursor-pointer flex justify-center items-center gap-2"
            :class="isLoading ? 'opacity-70 cursor-not-allowed hover:transform-none' : 'hover:-translate-y-0.5'"
          >
            <svg v-if="isLoading" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isLoading ? 'Mendaftarkan Akun...' : 'Daftar Akun' }}
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-slate-600">
          Sudah punya akun? 
          <RouterLink to="/login" class="text-green-600 font-bold hover:underline">
            Masuk di sini
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>