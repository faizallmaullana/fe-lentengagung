<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiGet } from '@/axios'
import { useAuthStore } from '@/stores/auth'
import Swal from 'sweetalert2'
import heroBg from '@/assets/images/hero-bg.png'

const router = useRouter()
const authStore = useAuthStore()

// State untuk loading dan data
const isLoading = ref(true)
const userApplications = ref([])
const activeTab = ref('Semua')

// Fetch data aplikasi user
const fetchUserApplications = async () => {
  try {
    isLoading.value = true
    const data = await apiGet('/form/list')
    // Filter hanya aplikasi milik user yang sedang login
    const applications = data || []
    
    // Untuk setiap aplikasi, ambil detail form untuk mendapatkan nama pewaris
    const applicationsWithPewaris = await Promise.all(
      applications.map(async (app) => {
        try {
          const detail = await apiGet(`/form/${app.id}`)
          return {
            ...app,
            pewaris_nama: detail.pewaris?.nama || 'Belum diisi'
          }
        } catch (error) {
          console.error(`Error fetching detail for ${app.id}:`, error)
          return {
            ...app,
            pewaris_nama: 'Belum diisi'
          }
        }
      })
    )
    
    userApplications.value = applicationsWithPewaris
  } catch (error) {
    console.error('Error fetching user applications:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Gagal memuat data permohonan'
    })
  } finally {
    isLoading.value = false
  }
}

// Format tanggal
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

// Mapping status untuk display dan aksi
const getStatusInfo = (status) => {
  const statusMap = {
    'Pending': { 
      text: 'Diajukan', 
      class: 'bg-yellow-100 text-yellow-700',
      action: 'none',
      description: 'Menunggu review dari admin'
    },
    'Review': { 
      text: 'Sedang Ditinjau', 
      class: 'bg-blue-100 text-blue-700',
      action: 'none',
      description: 'Sedang dalam proses peninjauan'
    },
    'Disetujui': { 
      text: 'Disetujui', 
      class: 'bg-green-100 text-green-700',
      action: 'download',
      description: 'Siap untuk diunduh'
    },
    'Approved': { 
      text: 'Disetujui', 
      class: 'bg-green-100 text-green-700',
      action: 'download',
      description: 'Siap untuk diunduh'
    },
    'Ditolak': { 
      text: 'Ditolak', 
      class: 'bg-red-100 text-red-700',
      action: 'update',
      description: 'Perlu perbaikan'
    },
    'Rejected': { 
      text: 'Ditolak', 
      class: 'bg-red-100 text-red-700',
      action: 'update',
      description: 'Perlu perbaikan'
    }
  }
  return statusMap[status] || { 
    text: status, 
    class: 'bg-gray-100 text-gray-700',
    action: 'none',
    description: '-'
  }
}

// Filter berdasarkan tab
const tabs = ['Semua', 'Diajukan', 'Sedang Ditinjau', 'Disetujui', 'Ditolak']

const filteredApps = computed(() => {
  if (activeTab.value === 'Semua') return userApplications.value
  
  return userApplications.value.filter(app => {
    const statusInfo = getStatusInfo(app.status)
    return statusInfo.text === activeTab.value
  })
})

// Actions
const handleDownload = async (application) => {
  try {
    // Tampilkan loading
    Swal.fire({
      title: 'Menyiapkan Dokumen PDF',
      html: `Mengunduh dokumen untuk ${application.kode_registrasi}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    })

    // Buat URL untuk download PDF
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:9090/api'
    const token = localStorage.getItem('token')
    const pdfUrl = `${baseUrl}/form/${application.id}/pdf`
    
    // Buat link download dengan authorization header
    const response = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Gagal mengunduh PDF')
    }

    // Convert response ke blob
    const blob = await response.blob()
    
    // Buat download link
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `surat-pernyataan-${application.kode_registrasi || application.id}.pdf`
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Cleanup
    window.URL.revokeObjectURL(downloadUrl)

    // Tutup loading dan tampilkan success
    Swal.fire({
      icon: 'success',
      title: 'Download Berhasil!',
      text: 'Surat Pernyataan Ahli Waris telah berhasil diunduh.',
      confirmButtonText: 'Tutup'
    })

  } catch (error) {
    console.error('Error downloading PDF:', error)
    Swal.fire({
      icon: 'error',
      title: 'Download Gagal',
      text: 'Terjadi kesalahan saat mengunduh dokumen. Silakan coba lagi.',
      confirmButtonText: 'Tutup'
    })
  }
}

const handleUpdate = (application) => {
  Swal.fire({
    title: 'Perbarui Permohonan',
    text: 'Anda akan diarahkan ke halaman edit untuk memperbaiki dokumen.',
    icon: 'info',
    showCancelButton: true,
    confirmButtonText: 'Perbarui Sekarang',
    cancelButtonText: 'Nanti Saja'
  }).then((result) => {
    if (result.isConfirmed) {
      // Arahkan ke halaman edit atau pengajuan form
      router.push('/dashboard/pengajuan')
    }
  })
}

// Load data saat component mount
onMounted(() => {
  fetchUserApplications()
})
</script>

<template>
  <div class="space-y-6">
    
    <div class="relative w-full h-48 rounded-2xl overflow-hidden shadow-sm group">
        <div 
            class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            :style="{ backgroundImage: `url(${heroBg})` }"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-900/20"></div>
        
        <div class="relative z-10 h-full flex flex-col justify-center px-8 text-white">
            <h1 class="text-3xl font-bold mb-2">
              Halo, {{ authStore.name || 'User' }}!
            </h1>
            <p class="text-lg opacity-90">Pantau status surat waris Anda dengan mudah di sini.</p>
        </div>
    </div>

    <div class="flex flex-wrap gap-3">
        <button 
            v-for="tab in tabs" 
            :key="tab"
            @click="activeTab = tab"
            class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm border"
            :class="activeTab === tab 
                ? 'bg-blue-700 text-white border-blue-700 shadow-md' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
        >
            {{ tab }}
        </button>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
        
        <div class="grid grid-cols-6 gap-4 p-5 border-b border-gray-100 text-sm font-bold text-gray-500 bg-gray-50/50 rounded-t-xl">
            <div>NO. REGISTRASI</div>
            <div>NAMA PEWARIS</div>
            <div>TANGGAL PENGAJUAN</div>
            <div>STATUS</div>
            <div>KETERANGAN</div>
            <div class="text-center">AKSI</div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex-1 flex items-center justify-center p-10">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-4 text-gray-500">Memuat data permohonan...</p>
          </div>
        </div>

        <!-- Data List -->
        <div v-else-if="filteredApps.length > 0" class="flex-1">
            <div 
                v-for="app in filteredApps" 
                :key="app.id"
                class="grid grid-cols-6 gap-4 p-5 border-b border-gray-50 items-center text-sm transition-colors"
                :class="getStatusInfo(app.status).action === 'update' ? 'bg-red-50 border-l-4 border-l-red-500' : 'hover:bg-gray-50'"
            >
                <div class="font-medium text-slate-800">{{ app.id || '-' }}</div>
                <div class="text-slate-700 font-medium">{{ app.pewaris_nama || 'Belum diisi' }}</div>
                <div class="text-slate-500">{{ formatDate(app.timestamp) }}</div>
                <div>
                    <span 
                        class="px-3 py-1 rounded-full text-xs font-semibold inline-block"
                        :class="getStatusInfo(app.status).class"
                    >
                        {{ getStatusInfo(app.status).text }}
                    </span>
                </div>
                <div class="text-slate-600 text-xs">
                  <!-- Tampilkan alasan dari admin jika ada -->
                  <span v-if="app.alasan" class="block mb-1 p-2 bg-gray-100 rounded text-gray-700 italic">
                    "{{ app.alasan }}"
                  </span>
                  {{ getStatusInfo(app.status).description }}
                </div>
                <div class="text-center">
                  <!-- Tombol Download untuk status Disetujui -->
                  <button 
                    v-if="getStatusInfo(app.status).action === 'download'"
                    @click="handleDownload(app)"
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1 mx-auto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Unduh PDF
                  </button>
                  
                  <!-- Tombol Update untuk status Ditolak -->
                  <button 
                    v-else-if="getStatusInfo(app.status).action === 'update'"
                    @click="handleUpdate(app)"
                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center gap-1 mx-auto animate-pulse"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Perbaiki
                  </button>
                  
                  <!-- Status info untuk yang lain -->
                  <span v-else class="text-gray-500 text-xs">
                    {{ getStatusInfo(app.status).description }}
                  </span>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mb-4 opacity-50">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p>{{ activeTab === 'Semua' ? 'Belum ada permohonan yang diajukan.' : `Belum ada dokumen di kategori ${activeTab}.` }}</p>
            <button 
              v-if="activeTab === 'Semua'"
              @click="router.push('/dashboard/pengajuan')"
              class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Buat Permohonan Baru
            </button>
        </div>

    </div>
  </div>
</template>