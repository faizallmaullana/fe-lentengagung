<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiGet } from '@/axios'
import Swal from 'sweetalert2'

const route = useRoute()
const router = useRouter()

const applicationId = route.params.id
const isLoading = ref(true)
const error = ref(null)

// State untuk Dokumen yang sedang dipreview di kanan
const activeDoc = ref('ktp') // Default: KTP

// Data detail form dari API
const formDetail = ref(null)

// Computed untuk mendapatkan URL file berdasarkan filename
const getFileUrl = (fileType, fileName) => {
  if (!fileName) return null
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:9090/api'
  return `${baseUrl}/upload/${fileType}/${fileName}`
}

// Computed untuk daftar dokumen yang tersedia
const availableDocuments = computed(() => {
  if (!formDetail.value) return []
  
  const docs = []
  const pewaris = formDetail.value.pewaris
  
  // Dokumen Pewaris
  if (pewaris?.ktpFileName) {
    docs.push({
      key: 'ktp_pewaris',
      label: 'KTP Pewaris', 
      url: getFileUrl('ktp', pewaris.ktpFileName),
      fileName: pewaris.ktpFileName
    })
  }
  
  if (pewaris?.aktaFileName) {
    docs.push({
      key: 'akta_kematian',
      label: 'Akta Kematian',
      url: getFileUrl('akta', pewaris.aktaFileName),
      fileName: pewaris.aktaFileName
    })
  }

  // Dokumen Ahli Waris - KTP dan Akta
  formDetail.value.ahliWarisList?.forEach((ahli, index) => {
    if (ahli.ktpFileName) {
      docs.push({
        key: `ktp_ahli_${index}`,
        label: `KTP ${ahli.nama}`,
        url: getFileUrl('ktp', ahli.ktpFileName),
        fileName: ahli.ktpFileName
      })
    }
    if (ahli.aktaFileName) {
      docs.push({
        key: `akta_ahli_${index}`,
        label: `Akta ${ahli.nama}`,
        url: getFileUrl('akta', ahli.aktaFileName),
        fileName: ahli.aktaFileName
      })
    }
  })

  // Dokumen Saksi - KTP
  formDetail.value.saksiList?.forEach((saksi, index) => {
    if (saksi.ktpFileName) {
      docs.push({
        key: `ktp_saksi_${index}`,
        label: `KTP ${saksi.nama}`,
        url: getFileUrl('ktp', saksi.ktpFileName),
        fileName: saksi.ktpFileName
      })
    }
  })

  // Dokumen Pendukung
  formDetail.value.dokumenPendukung?.forEach((dok, index) => {
    if (dok.fileName) {
      docs.push({
        key: `dokumen_${index}`,
        label: dok.nama || `Dokumen ${index + 1}`,
        url: getFileUrl('documents', dok.fileName),
        fileName: dok.fileName
      })
    }
  })

  return docs
})

// URL dokumen yang sedang aktif
const activeDocumentUrl = computed(() => {
  const doc = availableDocuments.value.find(d => d.key === activeDoc.value)
  return doc?.url || null
})

// Fetch detail form dari API
const fetchFormDetail = async () => {
  try {
    isLoading.value = true
    error.value = null
    const data = await apiGet(`/form/${applicationId}`)
    formDetail.value = data
    
    // Set dokumen aktif ke dokumen pertama yang tersedia
    if (availableDocuments.value.length > 0) {
      activeDoc.value = availableDocuments.value[0].key
    }
  } catch (err) {
    console.error('Error fetching form detail:', err)
    error.value = err.message || 'Gagal memuat detail formulir'
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
    month: 'long',
    year: 'numeric'
  })
}

// Load data saat component di-mount
onMounted(() => {
  fetchFormDetail()
})

// --- ACTIONS ---

const handleApprove = () => {
  Swal.fire({
    title: 'Setujui Permohonan?',
    text: "Status akan berubah menjadi 'Draft Siap' dan notifikasi dikirim ke warga.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#16a34a',
    confirmButtonText: 'Ya, Setujui'
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire('Berhasil', 'Permohonan disetujui. Draft surat telah dibuat.', 'success')
      router.push('/admin/antrian')
    }
  })
}

const handleReject = () => {
  Swal.fire({
    title: 'Tolak / Minta Revisi',
    input: 'textarea',
    inputLabel: 'Alasan Penolakan / Catatan Revisi',
    inputPlaceholder: 'Contoh: Scan KTP buram, mohon upload ulang...',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    confirmButtonText: 'Kirim Revisi'
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      Swal.fire('Terkirim', 'Instruksi revisi telah dikirim ke pemohon.', 'success')
      router.push('/admin/antrian')
    }
  })
}

const handleGenerateDraft = () => {
  // Simulasi Generate PDF
  let timerInterval
  Swal.fire({
    title: 'Membuat Draft Surat...',
    html: 'Menyusun data ke dalam format resmi Kelurahan.',
    timer: 2000,
    timerProgressBar: true,
    didOpen: () => { Swal.showLoading() },
    willClose: () => { clearInterval(timerInterval) }
  }).then((result) => {
    // Tampilkan Preview PDF (Mock)
    Swal.fire({
      icon: 'success',
      title: 'Draft Selesai!',
      text: 'Draft PDF siap untuk dicetak atau ditandatangani.',
      confirmButtonText: 'Lihat Preview PDF'
    })
  })
}
</script>

<template>
  <div class="h-[calc(100vh-4rem)] flex flex-col">
    
    <div class="flex items-center justify-between mb-4 px-1">
      <div class="flex items-center gap-4">
        <button @click="router.back()" class="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            Verifikasi: {{ applicationId }}
            <span v-if="formDetail" class="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 border border-yellow-200">
              Review
            </span>
          </h1>
          <p class="text-xs text-gray-500" v-if="formDetail">Form ID: {{ formDetail.id_form }}</p>
        </div>
      </div>

      <div class="flex gap-2">
        <button 
          @click="handleGenerateDraft"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          Generate Draft
        </button>
      </div>
    </div>

    <div v-if="!isLoading && !error && formDetail" class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
      
      <div class="bg-white rounded-xl border border-gray-200 overflow-y-auto shadow-sm p-6 space-y-8 h-full custom-scrollbar">
        
        <!-- Data Pewaris -->
        <div v-if="formDetail.pewaris">
          <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">1. Data Pewaris</h3>
          <div class="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div class="text-gray-500">NIK</div>
            <div class="font-medium text-gray-900">{{ formDetail.pewaris.nik || '-' }}</div>
            <div class="text-gray-500">Nama Lengkap</div>
            <div class="font-medium text-gray-900">{{ formDetail.pewaris.nama || '-' }}</div>
            <div class="text-gray-500">Tanggal Lahir</div>
            <div class="font-medium text-gray-900">{{ formatDate(formDetail.pewaris.tanggalLahir) }}</div>
            <div class="text-gray-500">Tempat Lahir</div>
            <div class="font-medium text-gray-900">{{ formDetail.pewaris.tempatLahir || '-' }}</div>
            <div class="text-gray-500">Tanggal Meninggal</div>
            <div class="font-medium text-gray-900">{{ formatDate(formDetail.pewaris.tanggalMeninggal) }}</div>
            <div class="text-gray-500">Alamat</div>
            <div class="font-medium text-gray-900">{{ formDetail.pewaris.alamat || '-' }}</div>
            <div class="text-gray-500">Agama</div>
            <div class="font-medium text-gray-900">{{ formDetail.pewaris.agama || '-' }}</div>
            <div class="text-gray-500">Pekerjaan</div>
            <div class="font-medium text-gray-900">{{ formDetail.pewaris.pekerjaan || '-' }}</div>
            <div class="text-gray-500">Status Perkawinan</div>
            <div class="font-medium text-gray-900">{{ formDetail.pewaris.statusPerkawinan || '-' }}</div>
          </div>
        </div>

        <!-- Data Ahli Waris -->
        <div v-if="formDetail.ahliWarisList && formDetail.ahliWarisList.length > 0">
          <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">2. Data Ahli Waris</h3>
          <div class="space-y-3">
            <div v-for="(ahli, idx) in formDetail.ahliWarisList" :key="idx" class="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
              <div class="flex justify-between font-bold text-gray-800">
                <span>{{ ahli.nama || '-' }}</span>
                <span class="text-blue-600 bg-blue-50 px-2 rounded">{{ ahli.hubungan || '-' }}</span>
              </div>
              <div class="text-gray-500 mt-1">NIK: {{ ahli.nik || '-' }}</div>
              <div class="flex gap-2 mt-2">
                <div v-if="ahli.ktpFileName" class="text-xs text-green-600">
                  ✓ KTP tersedia
                </div>
                <div v-if="ahli.aktaFileName" class="text-xs text-green-600">
                  ✓ Dokumen akta tersedia
                </div>
                <div v-if="!ahli.ktpFileName && !ahli.aktaFileName" class="text-xs text-red-600">
                  ✗ Belum ada dokumen
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Data Saksi -->
        <div v-if="formDetail.saksiList && formDetail.saksiList.length > 0">
          <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">3. Data Saksi</h3>
          <div class="space-y-3">
            <div v-for="(saksi, idx) in formDetail.saksiList" :key="idx" class="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
              <div class="flex justify-between font-bold text-gray-800">
                <span>{{ saksi.nama || '-' }}</span>
                <span class="text-purple-600 bg-purple-50 px-2 rounded">{{ saksi.hubungan || 'Saksi' }}</span>
              </div>
              <div class="text-gray-500 mt-1">NIK: {{ saksi.nik || '-' }}</div>
              <div v-if="saksi.ktpFileName" class="text-xs text-green-600 mt-1">
                ✓ Dokumen KTP tersedia
              </div>
            </div>
          </div>
        </div>

        <!-- Dokumen Pendukung -->
        <div v-if="formDetail.dokumenPendukung && formDetail.dokumenPendukung.length > 0">
          <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">4. Dokumen Pendukung</h3>
          <div class="space-y-2">
            <div v-for="(dok, idx) in formDetail.dokumenPendukung" :key="idx" class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
              <span class="font-medium">{{ dok.nama || `Dokumen ${idx + 1}` }}</span>
              <span v-if="dok.uploaded" class="text-xs text-green-600">✓ Terupload</span>
              <span v-else class="text-xs text-red-600">✗ Belum upload</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Panel Preview Dokumen -->
      <div class="bg-gray-800 rounded-xl overflow-hidden flex flex-col shadow-lg h-full">
        
        <!-- Tab Dokumen -->
        <div class="bg-gray-900 p-2 flex justify-center gap-2 overflow-x-auto" v-if="availableDocuments.length > 0">
          <button 
            v-for="doc in availableDocuments"
            :key="doc.key"
            @click="activeDoc = doc.key" 
            class="px-3 py-2 rounded text-xs font-semibold transition-colors whitespace-nowrap"
            :class="activeDoc === doc.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
          >
            {{ doc.label }}
          </button>
        </div>

        <!-- Area Preview -->
        <div class="flex-1 bg-gray-700 flex items-center justify-center relative p-4 overflow-hidden">
          <div v-if="availableDocuments.length === 0" class="text-gray-400 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto mb-2 opacity-50">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 18.75h-8.25A2.25 2.25 0 016 19.5V4.5a2.25 2.25 0 012.25-2.25H9" />
            </svg>
            <p class="text-sm">Tidak ada dokumen tersedia</p>
          </div>
          
          <img 
            v-else-if="activeDocumentUrl"
            :src="activeDocumentUrl" 
            alt="Preview Dokumen" 
            class="max-h-full max-w-full object-contain shadow-2xl rounded"
            @error="$event.target.style.display='none'"
          />
          
          <div v-if="activeDocumentUrl" class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
            Mode Pratinjau
          </div>
        </div>

      </div>

    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-4 text-gray-500">Memuat detail formulir...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center text-red-600">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto mb-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p class="text-lg font-semibold">Error</p>
        <p class="text-sm">{{ error }}</p>
        <button @click="fetchFormDetail" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    </div>

    <div class="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-4 bg-gray-50 -mx-8 px-8 pb-4 sticky bottom-0">
      <button 
        @click="handleReject"
        class="px-6 py-2.5 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
      >
        Tolak / Revisi
      </button>
      <button 
        @click="handleApprove"
        class="px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-600/20 transition-colors"
      >
        Setujui Permohonan
      </button>
    </div>

  </div>
</template>

<style scoped>
/* Scrollbar Kustom agar rapi di dalam panel */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>