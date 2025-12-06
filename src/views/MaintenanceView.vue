<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- 1. LOGIKA COUNTDOWN (INTERAKTIF) ---
// Simulasi waktu "Estimasi Selesai" (misal: 2 jam dari sekarang)
const targetTime = new Date().getTime() + (2 * 60 * 60 * 1000) 
const timeLeft = ref({ hours: '02', minutes: '00', seconds: '00' })
let timerInterval = null

const updateTimer = () => {
  const now = new Date().getTime()
  const distance = targetTime - now

  if (distance < 0) {
    clearInterval(timerInterval)
    return
  }

  const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((distance % (1000 * 60)) / 1000)

  timeLeft.value = {
    hours: String(h).padStart(2, '0'),
    minutes: String(m).padStart(2, '0'),
    seconds: String(s).padStart(2, '0')
  }
}

// --- 2. LOGIKA CEK STATUS (INTERAKTIF) ---
const isChecking = ref(false)
const statusMessage = ref('')

const checkStatus = () => {
  isChecking.value = true
  statusMessage.value = ''
  
  // Simulasi loading
  setTimeout(() => {
    isChecking.value = false
    statusMessage.value = 'Server masih dalam perbaikan. Mohon tunggu.'
  }, 2000)
}

const goHome = () => {
  router.push('/')
}

onMounted(() => {
  timerInterval = setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  clearInterval(timerInterval)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
    <div class="max-w-2xl w-full text-center">
      
      <div class="relative w-64 h-64 mx-auto mb-8">
        <div class="absolute inset-0 bg-blue-100 rounded-full opacity-50 animate-pulse"></div>
        
        <svg class="absolute top-10 left-10 w-44 h-44 text-blue-600 animate-spin-slow" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
        
        <svg class="absolute bottom-4 right-10 w-24 h-24 text-green-500 animate-spin-reverse" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </div>

      <h1 class="text-4xl font-extrabold text-slate-800 mb-4">Sistem Sedang Ditingkatkan</h1>
      <p class="text-lg text-slate-500 mb-8 max-w-lg mx-auto leading-relaxed">
        Kami sedang melakukan pemeliharaan rutin untuk meningkatkan performa layanan Siwaris. Fitur ini akan segera kembali.
      </p>

      <div class="flex justify-center gap-4 mb-10">
        <div class="flex flex-col items-center">
            <span class="text-3xl font-mono font-bold text-blue-600 bg-white shadow-sm border border-blue-100 rounded-lg p-3 w-20">{{ timeLeft.hours }}</span>
            <span class="text-xs text-slate-400 mt-2 uppercase tracking-wide">Jam</span>
        </div>
        <div class="text-3xl font-bold text-slate-300 pt-3">:</div>
        <div class="flex flex-col items-center">
            <span class="text-3xl font-mono font-bold text-blue-600 bg-white shadow-sm border border-blue-100 rounded-lg p-3 w-20">{{ timeLeft.minutes }}</span>
            <span class="text-xs text-slate-400 mt-2 uppercase tracking-wide">Menit</span>
        </div>
        <div class="text-3xl font-bold text-slate-300 pt-3">:</div>
        <div class="flex flex-col items-center">
            <span class="text-3xl font-mono font-bold text-blue-600 bg-white shadow-sm border border-blue-100 rounded-lg p-3 w-20">{{ timeLeft.seconds }}</span>
            <span class="text-xs text-slate-400 mt-2 uppercase tracking-wide">Detik</span>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button 
            @click="goHome"
            class="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all shadow-sm w-full sm:w-auto"
        >
            Kembali ke Beranda
        </button>
        
        <button 
            @click="checkStatus"
            :disabled="isChecking"
            class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px]"
        >
            <svg v-if="isChecking" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isChecking ? 'Mengecek...' : 'Cek Status Server' }}
        </button>
      </div>

      <p v-if="statusMessage" class="mt-6 text-sm text-amber-600 font-medium bg-amber-50 inline-block px-4 py-2 rounded-full animate-bounce">
        ⚠️ {{ statusMessage }}
      </p>

    </div>
  </div>
</template>

<style scoped>
/* Animasi Gear Berputar Lambat */
.animate-spin-slow {
  animation: spin 8s linear infinite;
}

/* Animasi Gear Berputar Lawan Arah */
.animate-spin-reverse {
  animation: spin 6s linear infinite reverse;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>