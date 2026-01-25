<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiGet } from '@/axios'
import heroBg from '@/assets/images/hero-bg.png'

const router = useRouter()

// State untuk loading dan data
const isLoading = ref(true)
const applications = ref([])
const searchQuery = ref('')

// Data Statistik berdasarkan data real
const stats = computed(() => [
  { 
    label: 'Permohonan Baru', 
    count: applications.value.filter(app => app.status === 'Pending' || app.status === 'Submitted').length, 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-50', 
    bar: 'bg-yellow-500' 
  },
  { 
    label: 'Permohonan Berjalan', 
    count: applications.value.filter(app => app.status === 'Review' || app.status === 'InProcess').length, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50', 
    bar: 'bg-blue-500' 
  },
  { 
    label: 'Dalam Perbaikan', 
    count: applications.value.filter(app => app.status === 'Revision' || app.status === 'Rejected').length, 
    color: 'text-red-600', 
    bg: 'bg-red-50', 
    bar: 'bg-red-500' 
  },
])

// Data yang difilter berdasarkan search
const filteredApplications = computed(() => {
  if (!searchQuery.value) return applications.value
  return applications.value.filter(app => 
    app.profile_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    app.id?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Fetch data dari API
const fetchApplications = async () => {
  try {
    isLoading.value = true
    const data = await apiGet('/form/list')
    applications.value = data || []
  } catch (error) {
    console.error('Error fetching applications:', error)
    // Tampilkan notifikasi error jika perlu
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

// Format status untuk display
const getStatusInfo = (status) => {
  const statusMap = {
    'Pending': { text: 'Diajukan', class: 'bg-yellow-100 text-yellow-700' },
    'Submitted': { text: 'Diajukan', class: 'bg-yellow-100 text-yellow-700' },
    'Review': { text: 'Ditinjau', class: 'bg-blue-100 text-blue-700' },
    'InProcess': { text: 'Diproses', class: 'bg-blue-100 text-blue-700' },
    'Revision': { text: 'Revisi', class: 'bg-red-100 text-red-700' },
    'Rejected': { text: 'Ditolak', class: 'bg-red-100 text-red-700' },
    'Approved': { text: 'Disetujui', class: 'bg-green-100 text-green-700' },
    'Completed': { text: 'Selesai', class: 'bg-green-100 text-green-700' }
  }
  return statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-700' }
}

// Navigasi ke halaman verifikasi
const handleVerifikasi = (id) => {
  router.push(`/admin/verifikasi/${id}`)
}

// Load data saat component di-mount
onMounted(() => {
  fetchApplications()
})
</script>

<template>
  <div class="space-y-8">
    
    <h2 class="text-2xl font-bold text-gray-800">Dashboard Petugas</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div 
        v-for="(stat, index) in stats" 
        :key="index"
        class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden"
      >
        <div>
          <h3 class="text-4xl font-bold text-gray-800 mb-1">{{ stat.count }}</h3>
          <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
        </div>
        <div class="w-full bg-gray-100 h-1.5 rounded-full mt-4">
            <div class="h-1.5 rounded-full" :class="stat.bar" style="width: 70%"></div>
        </div>
        <div class="absolute right-4 top-4 w-10 h-10 rounded-full flex items-center justify-center opacity-20" :class="stat.bg">
            <div class="w-4 h-4 rounded-full" :class="stat.bar"></div>
        </div>
      </div>
    </div>

    <div class="relative w-full h-48 rounded-2xl overflow-hidden shadow-sm group">
        <div 
            class="absolute inset-0 bg-cover bg-center"
            :style="{ backgroundImage: `url(${heroBg})` }"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-900/20"></div>
        <div class="relative z-10 h-full flex flex-col justify-center px-8 text-white">
            <h1 class="text-3xl font-bold mb-2">Antrian Verifikasi</h1>
            <p class="text-lg opacity-90">Segera proses permohonan yang masuk untuk pelayanan prima.</p>
        </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
            <h3 class="text-lg font-bold text-gray-800">Daftar Permohonan</h3>
            <p class="text-sm text-gray-500">
              <span v-if="isLoading">Memuat data...</span>
              <span v-else>Total {{ applications.length }} permohonan</span>
            </p>
        </div>
        <div class="relative">
            <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Cari nama pemohon atau kode..." 
                class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 w-64 transition-all"
                :disabled="isLoading"
            />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-400 absolute left-3 top-3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
        </div>
      </div>

      <table class="w-full text-left text-sm text-gray-600">
        <thead class="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-xs border-b border-gray-100">
          <tr>
            <th class="px-6 py-4">Kode Registrasi</th>
            <th class="px-6 py-4">Nama Pemohon</th>
            <th class="px-6 py-4">NIK</th>
            <th class="px-6 py-4">Tanggal Masuk</th>
            <th class="px-6 py-4 text-center">Status</th>
            <th class="px-6 py-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <!-- Loading State -->
          <tr v-if="isLoading">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">
              <div class="flex justify-center items-center gap-2">
                <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memuat data...
              </div>
            </td>
          </tr>
          
          <!-- Empty State -->
          <tr v-else-if="filteredApplications.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">
              <div class="flex flex-col items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-gray-400">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>{{ searchQuery ? 'Tidak ada data yang sesuai pencarian' : 'Belum ada permohonan' }}</span>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr v-else v-for="app in filteredApplications" :key="app.id" class="hover:bg-blue-50/30 transition-colors">
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ app.id || '-' }}
            </td>
            <td class="px-6 py-4">
              {{ app.profile_name || app.user_email || '-' }}
            </td>
            <td class="px-6 py-4 text-gray-600">
              {{ app.profile_nik || '-' }}
            </td>
            <td class="px-6 py-4">
              {{ formatDate(app.timestamp) }}
            </td>
            <td class="px-6 py-4 text-center">
              <span 
                class="px-3 py-1 rounded-full text-xs font-semibold inline-block"
                :class="getStatusInfo(app.status).class"
              >
                {{ getStatusInfo(app.status).text }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button 
                @click="handleVerifikasi(app.id)"
                class="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded transition-all"
              >
                Verifikasi
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-500" v-if="!isLoading">
        <span v-if="searchQuery">
          Menampilkan {{ filteredApplications.length }} dari {{ applications.length }} data
        </span>
        <span v-else>
          Menampilkan {{ applications.length }} data
        </span>
      </div>
    </div>

  </div>
</template>