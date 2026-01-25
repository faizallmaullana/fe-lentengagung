<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiGet } from '@/axios'
import Swal from 'sweetalert2'

// State untuk data dan loading
const isLoading = ref(true)
const allApplications = ref([])
const searchQuery = ref('')
const selectedYear = ref('')

// Fetch data dari API
const fetchApprovedApplications = async () => {
  try {
    isLoading.value = true
    const data = await apiGet('/form/list')
    // Filter hanya yang statusnya Disetujui atau Approved
    allApplications.value = (data || []).filter(app => 
      app.status === 'Disetujui' || 
      app.status === 'Approved'
    )
  } catch (error) {
    console.error('Error fetching approved applications:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Gagal memuat data arsip dokumen'
    })
  } finally {
    isLoading.value = false
  }
}

// Format tanggal untuk display
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
}

// Extract year from date string
const getYear = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).getFullYear().toString()
}

// Computed untuk tahun unik yang tersedia
const availableYears = computed(() => {
  const years = allApplications.value
    .map(app => getYear(app.timestamp))
    .filter(year => year)
  return [...new Set(years)].sort((a, b) => b - a)
})

// Logika filtering
const filteredArchives = computed(() => {
  return allApplications.value.filter(app => {
    const matchQuery = 
      app.profile_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      app.kode_registrasi?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      app.user_email?.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchYear = selectedYear.value 
      ? getYear(app.timestamp) === selectedYear.value
      : true

    return matchQuery && matchYear
  })
})

// Actions untuk download dan print
const handleDownload = (application) => {
  Swal.fire({
    title: 'Mengambil Dokumen...',
    html: 'Sedang menyiapkan file dokumen.',
    timer: 1500,
    timerProgressBar: true,
    didOpen: () => Swal.showLoading()
  }).then(() => {
    Swal.fire({
      icon: 'success', 
      title: 'Unduhan Berhasil',
      text: `Dokumen untuk ${application.profile_name} telah disimpan.`,
      confirmButtonColor: '#16a34a'
    })
  })
}

const handlePrint = (application) => {
  Swal.fire({
    title: 'Mencetak...',
    text: `Menyiapkan antarmuka cetak untuk ${application.profile_name}`,
    icon: 'info',
    timer: 1000,
    showConfirmButton: false
  })
}

// Load data saat component mount
onMounted(() => {
  fetchApprovedApplications()
})
</script>

<template>
  <div class="space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Arsip Digital</h2>
        <p class="text-sm text-gray-500">
          <span v-if="isLoading">Memuat data...</span>
          <span v-else>{{ allApplications.length }} dokumen yang telah disetujui</span>
        </p>
      </div>
      
      <div class="flex gap-3">
        <select 
          v-model="selectedYear" 
          class="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
          :disabled="isLoading"
        >
          <option value="">Semua Tahun</option>
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
        </select>

        <div class="relative">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Cari Nama / No. Surat..." 
            class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64 transition-all"
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-400 absolute left-3 top-3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table class="w-full text-left text-sm text-gray-600">
        <thead class="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-xs border-b border-gray-100">
          <tr>
            <th class="px-6 py-4">Kode Registrasi</th>
            <th class="px-6 py-4">Nama Pemohon</th>
            <th class="px-6 py-4">NIK</th>
            <th class="px-6 py-4">Tanggal Disetujui</th>
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
                Memuat arsip dokumen...
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr v-else v-for="app in filteredArchives" :key="app.id" class="hover:bg-blue-50/30 transition-colors">
            <td class="px-6 py-4 font-mono text-blue-600 font-medium">{{ app.kode_registrasi || '-' }}</td>
            <td class="px-6 py-4 font-bold text-gray-800">{{ app.profile_name || app.user_email || '-' }}</td>
            <td class="px-6 py-4">{{ app.profile_nik || '-' }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-1 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {{ formatDate(app.timestamp) }}
              </div>
            </td>
            <td class="px-6 py-4 text-center">
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                {{ app.status === 'Approved' ? 'Disetujui' : app.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-2">
                <button 
                  @click="handlePrint(app)"
                  class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-all"
                  title="Cetak Salinan"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 001.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                  </svg>
                </button>
                
                <button 
                  @click="handleDownload(app)"
                  class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-100 transition-all"
                  title="Unduh PDF"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="!isLoading && filteredArchives.length === 0" class="p-10 text-center text-gray-400">
        <div class="flex flex-col items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 opacity-50">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p>{{ searchQuery || selectedYear ? 'Tidak ada dokumen yang cocok dengan filter.' : 'Belum ada dokumen yang disetujui.' }}</p>
        </div>
      </div>
    </div>

  </div>
</template>