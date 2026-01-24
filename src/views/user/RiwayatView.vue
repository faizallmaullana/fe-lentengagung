<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import api from '@/axios'

const router = useRouter()
const searchQuery = ref('')

// --- STATE ---
const applications = ref([])
const isLoading = ref(false)
const showDetailModal = ref(false)
const selectedForm = ref(null)
const isLoadingDetail = ref(false)

// --- LOGIKA FILTER SEARCH ---
const filteredList = computed(() => {
  if (!searchQuery.value) return applications.value
  const query = searchQuery.value.toLowerCase()
  return applications.value.filter(app => 
    app.pewaris.toLowerCase().includes(query) || 
    app.id.toLowerCase().includes(query)
  )
})

// --- HELPER STATUS COLOR ---
const getStatusClass = (status) => {
  switch (status) {
    case 'Selesai': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'Sedang Diproses': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Perbaikan': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-yellow-100 text-yellow-700 border-yellow-200' // Diajukan
  }
}

// --- ACTIONS ---
const loadApplications = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/form/all')
    const data = res?.data
    // Normalize response shapes
    let items = []
    if (Array.isArray(data)) items = data
    else if (data && Array.isArray(data.data)) items = data.data
    else if (data) items = [data]

    // Map to UI shape
    applications.value = items.map(it => ({
      id: it.id || it.kode_registrasi || it.registration_code || '---',
      date: it.created_at || it.timestamp || it.date || '',
      pewaris: it.pewaris?.nama || it.fields?.nama || it.profile?.name || it.user_name || it.owner_name || '—',
      status: it.status || it.state || 'Diajukan',
      note: it.note || it.fields?.keterangan || ''
    }))
  } catch (error) {
    console.error('Failed to load applications', error)
    Swal.fire({ icon: 'error', title: 'Gagal memuat riwayat', text: 'Coba lagi nanti.' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadApplications()
})
const viewDetail = async (id) => {
  try {
    isLoadingDetail.value = true
    showDetailModal.value = true
    
    // Fetch form details from API
    const response = await api.get(`/form/${id}`)
    selectedForm.value = response.data
    
  } catch (error) {
    console.error('Failed to load form details:', error)
    showDetailModal.value = false
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memuat Detail',
      text: 'Terjadi kesalahan saat memuat detail form. Silakan coba lagi.',
      confirmButtonColor: '#d33'
    })
  } finally {
    isLoadingDetail.value = false
  }
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedForm.value = null
}

const viewDocument = (fileType, fileName) => {
  if (!fileName) return
  
  // Open document in new tab using backend endpoint
  const documentUrl = `${api.defaults.baseURL}/upload/${fileType}/${fileName}`
  window.open(documentUrl, '_blank')
}

const getDocumentUrl = (fileType, fileName) => {
  if (!fileName) return null
  return `${api.defaults.baseURL}/upload/${fileType}/${fileName}`
}

const downloadDoc = (docName) => {
  Swal.fire({
    title: 'Mengunduh Dokumen...',
    html: 'Mohon tunggu sebentar',
    timer: 2000,
    timerProgressBar: true,
    didOpen: () => { Swal.showLoading() }
  }).then(() => {
    Swal.fire({
      icon: 'success',
      title: 'Berhasil Diunduh',
      text: `File surat untuk ${docName} telah tersimpan di perangkat Anda.`
    })
  })
}
</script>

<template>
  <div class="space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Riwayat Pengajuan</h1>
        <p class="text-sm text-gray-500">Pantau status dan unduh surat waris Anda di sini.</p>
      </div>

      <div class="relative w-full md:w-72">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Cari nama atau no. reg..." 
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
        />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-400 absolute left-3 top-2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-gray-600">
          <thead class="bg-gray-50 border-b border-gray-100 text-xs uppercase font-semibold text-gray-500">
            <tr>
              <th class="px-6 py-4">No. Registrasi</th>
              <th class="px-6 py-4">Nama Pewaris</th>
              <th class="px-6 py-4">Tanggal Pengajuan</th>
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          
          <tbody class="divide-y divide-gray-50">
            <tr 
              v-for="item in filteredList" 
              :key="item.id" 
              class="hover:bg-gray-50 transition-colors group"
            >
              <td class="px-6 py-4 font-medium text-gray-900">
                {{ item.id }}
              </td>
              
              <td class="px-6 py-4">
                <p class="text-gray-900 font-medium">{{ item.pewaris }}</p>
                <p class="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{{ item.note }}</p>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-400">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {{ item.date }}
                </div>
              </td>

              <td class="px-6 py-4 text-center">
                <span 
                  class="px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5"
                  :class="getStatusClass(item.status)"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {{ item.status }}
                </span>
              </td>

              <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button 
                    @click="viewDetail(item.id)"
                    class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Lihat Detail"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  <button 
                    v-if="item.status === 'Selesai'"
                    @click="downloadDoc(item.pewaris)"
                    class="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Unduh Surat"
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
      </div>

      <div v-if="filteredList.length === 0" class="p-10 text-center text-gray-400">
        <div class="mb-4 bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 opacity-50">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <p class="text-sm font-medium">Data tidak ditemukan.</p>
      </div>

    </div>
  </div>

  <!-- Detail Modal -->
  <div v-if="showDetailModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Detail Pengajuan Waris</h2>
          <p class="text-sm text-gray-600">ID: {{ selectedForm?.id || '---' }}</p>
        </div>
        <button @click="closeDetailModal" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="flex-1 overflow-y-auto p-6">
        
        <!-- Loading State -->
        <div v-if="isLoadingDetail" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span class="ml-3 text-gray-600">Memuat detail...</span>
        </div>

        <!-- Form Details -->
        <div v-else-if="selectedForm" class="space-y-8">
          
          <!-- Status Section -->
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-700">Status Pengajuan</p>
                <p class="text-lg font-bold text-gray-900">{{ selectedForm.status || 'Diajukan' }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600">Tanggal Pengajuan</p>
                <p class="font-medium">{{ selectedForm.created_at || selectedForm.date || '---' }}</p>
              </div>
            </div>
          </div>

          <!-- Data Pewaris -->
          <div v-if="selectedForm.pewaris" class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              Data Pewaris
            </h3>
            
            <!-- KTP Pewaris Display -->
            <div v-if="selectedForm.pewaris.ktpFileName" class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p class="text-sm font-medium text-blue-800 mb-2">🆔 KTP Pewaris:</p>
              <img :src="getDocumentUrl('ktp', selectedForm.pewaris.ktpFileName)" alt="KTP Pewaris" class="w-full max-w-md mx-auto rounded-lg shadow-sm border border-gray-200" @error="$event.target.style.display='none'" />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span class="font-medium text-gray-700">Nama:</span> {{ selectedForm.pewaris.nama || '---' }}</div>
              <div><span class="font-medium text-gray-700">NIK:</span> {{ selectedForm.pewaris.nik || '---' }}</div>
              <div><span class="font-medium text-gray-700">Tempat/Tgl Lahir:</span> {{ selectedForm.pewaris.tempatLahir || '---' }} / {{ selectedForm.pewaris.tanggalLahir || '---' }}</div>
              <div><span class="font-medium text-gray-700">Jenis Kelamin:</span> {{ selectedForm.pewaris.jenisKelamin || '---' }}</div>
              <div><span class="font-medium text-gray-700">Agama:</span> {{ selectedForm.pewaris.agama || '---' }}</div>
              <div><span class="font-medium text-gray-700">Pekerjaan:</span> {{ selectedForm.pewaris.pekerjaan || '---' }}</div>
              <div class="md:col-span-2"><span class="font-medium text-gray-700">Alamat:</span> {{ selectedForm.pewaris.alamat || '---' }}</div>
            </div>
          </div>

          <!-- Data Ahli Waris -->
          <div v-if="selectedForm.ahliWarisList && selectedForm.ahliWarisList.length" class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              Data Ahli Waris ({{ selectedForm.ahliWarisList.length }})
            </h3>
            <div class="space-y-4">
              <div v-for="(ahli, index) in selectedForm.ahliWarisList" :key="index" class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center gap-2 mb-3">
                  <span class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">{{ ahli.hubungan || 'Ahli Waris' }}</span>
                </div>
                
                <!-- Documents Display -->
                <div class="space-y-3 mb-4">
                  <!-- Birth Certificate -->
                  <div v-if="ahli.aktaFileName" class="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p class="text-sm font-medium text-blue-800 mb-2">📄 Akta Kelahiran:</p>
                    <img :src="getDocumentUrl('akta', ahli.aktaFileName)" alt="Akta Kelahiran" class="w-full max-w-sm mx-auto rounded-lg shadow-sm border border-gray-200" @error="$event.target.style.display='none'" />
                  </div>
                  
                  <!-- KTP -->
                  <div v-if="ahli.ktpFileName" class="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p class="text-sm font-medium text-purple-800 mb-2">🆔 KTP:</p>
                    <img :src="getDocumentUrl('ktp', ahli.ktpFileName)" alt="KTP Ahli Waris" class="w-full max-w-sm mx-auto rounded-lg shadow-sm border border-gray-200" @error="$event.target.style.display='none'" />
                  </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span class="font-medium text-gray-700">Nama:</span> {{ ahli.nama || '---' }}</div>
                  <div><span class="font-medium text-gray-700">NIK:</span> {{ ahli.nik || '---' }}</div>
                  <div><span class="font-medium text-gray-700">Tempat/Tgl Lahir:</span> {{ ahli.tempatLahir || '---' }} / {{ ahli.tanggalLahir || '---' }}</div>
                  <div><span class="font-medium text-gray-700">Jenis Kelamin:</span> {{ ahli.jenisKelamin || '---' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Saksi -->
          <div v-if="selectedForm.saksiList && selectedForm.saksiList.length" class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Data Saksi ({{ selectedForm.saksiList.length }})
            </h3>
            <div class="space-y-4">
              <div v-for="(saksi, index) in selectedForm.saksiList" :key="index" class="bg-gray-50 rounded-lg p-4">
                <div class="mb-3">
                  <span class="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">Saksi {{ index + 1 }}</span>
                </div>
                
                <!-- KTP Display -->
                <div v-if="saksi.ktpFileName" class="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p class="text-sm font-medium text-purple-800 mb-2">🆔 KTP Saksi:</p>
                  <img :src="getDocumentUrl('ktp', saksi.ktpFileName)" alt="KTP Saksi" class="w-full max-w-sm mx-auto rounded-lg shadow-sm border border-gray-200" @error="$event.target.style.display='none'" />
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span class="font-medium text-gray-700">Nama:</span> {{ saksi.nama || '---' }}</div>
                  <div><span class="font-medium text-gray-700">NIK:</span> {{ saksi.nik || '---' }}</div>
                  <div><span class="font-medium text-gray-700">Tempat/Tgl Lahir:</span> {{ saksi.tempatLahir || '---' }} / {{ saksi.tanggalLahir || '---' }}</div>
                  <div><span class="font-medium text-gray-700">Pekerjaan:</span> {{ saksi.pekerjaan || '---' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dokumen Pendukung -->
          <div v-if="selectedForm.dokumenPendukung && selectedForm.dokumenPendukung.length" class="bg-white border border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Dokumen Pendukung ({{ selectedForm.dokumenPendukung.length }})
            </h3>
            <div class="space-y-4">
              <div v-for="(dok, index) in selectedForm.dokumenPendukung" :key="index" class="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div class="flex items-center gap-3 mb-3">
                  <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span class="font-medium text-orange-800">{{ dok.nama || '---' }}</span>
                  <span v-if="dok.uploaded" class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">✅ Terupload</span>
                  <span v-else class="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">❌ Belum upload</span>
                </div>
                <div v-if="dok.uploaded && dok.fileName">
                  <img :src="getDocumentUrl('documents', dok.fileName)" :alt="dok.nama" class="w-full max-w-sm mx-auto rounded-lg shadow-sm border border-gray-200" @error="$event.target.style.display='none'" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Modal Footer -->
      <div class="p-6 border-t border-gray-200 bg-gray-50">
        <div class="flex justify-end">
          <button @click="closeDetailModal" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Tutup
          </button>
        </div>
      </div>

    </div>
  </div>
</template>