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
const viewDetail = (id) => {
  // Nanti diarahkan ke halaman detail
  // router.push(`/dashboard/pengajuan/${id}`)
  Swal.fire({
    title: 'Detail Pengajuan',
    text: `Menampilkan detail untuk ${id} (Fitur Detail sedang dikembangkan)`,
    icon: 'info'
  })
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
</template>