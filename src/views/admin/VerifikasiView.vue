<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'

const route = useRoute()
const router = useRouter()

const applicationId = route.params.id
const isLoading = ref(true)

// State untuk Dokumen yang sedang dipreview di kanan
const activeDoc = ref('ktp') // Default: KTP

// --- MOCK DATA DETAIL (Simulasi Database) ---
const appData = ref({
  id: applicationId,
  status: 'Diajukan',
  tglPengajuan: '06 Des 2025',
  pewaris: {
    nik: '3174091234567890',
    nama: 'ALM. BUDI SANTOSO',
    tglMeninggal: '2025-11-20',
    alamat: 'Jl. Agung Raya I No. 9, RT 09/02, Lenteng Agung'
  },
  ahliWaris: [
    { nama: 'SITI AMINAH', nik: '3174098877665544', hubungan: 'Istri' },
    { nama: 'AGUNG SANTOSO', nik: '3174091122334455', hubungan: 'Anak Kandung' }
  ],
  harta: [
    { jenis: 'Tanah & Bangunan', deskripsi: 'Rumah Tinggal di Lenteng Agung', bukti: 'SHM No. 12345' },
    { jenis: 'Kendaraan', deskripsi: 'Honda Vario 2020', bukti: 'BPKB B 1234 SZZ' }
  ],
  documents: {
    ktp: 'https://via.placeholder.com/600x400?text=Scan+KTP+Pewaris',
    kk: 'https://via.placeholder.com/600x800?text=Scan+Kartu+Keluarga',
    kematian: 'https://via.placeholder.com/600x800?text=Surat+Kematian'
  }
})

// Simulasi Loading Data
onMounted(() => {
  setTimeout(() => { isLoading.value = false }, 800)
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
            <span class="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 border border-yellow-200">
              {{ appData.status }}
            </span>
          </h1>
          <p class="text-xs text-gray-500">Diajukan pada: {{ appData.tglPengajuan }}</p>
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

    <div v-if="!isLoading" class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
      
      <div class="bg-white rounded-xl border border-gray-200 overflow-y-auto shadow-sm p-6 space-y-8 h-full custom-scrollbar">
        
        <div>
          <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">1. Data Pewaris</h3>
          <div class="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div class="text-gray-500">NIK</div>
            <div class="font-medium text-gray-900">{{ appData.pewaris.nik }}</div>
            <div class="text-gray-500">Nama Lengkap</div>
            <div class="font-medium text-gray-900">{{ appData.pewaris.nama }}</div>
            <div class="text-gray-500">Tanggal Meninggal</div>
            <div class="font-medium text-gray-900">{{ appData.pewaris.tglMeninggal }}</div>
            <div class="text-gray-500">Alamat Terakhir</div>
            <div class="font-medium text-gray-900">{{ appData.pewaris.alamat }}</div>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">2. Data Ahli Waris</h3>
          <div class="space-y-3">
            <div v-for="(ahli, idx) in appData.ahliWaris" :key="idx" class="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
              <div class="flex justify-between font-bold text-gray-800">
                <span>{{ ahli.nama }}</span>
                <span class="text-blue-600 bg-blue-50 px-2 rounded">{{ ahli.hubungan }}</span>
              </div>
              <div class="text-gray-500 mt-1">NIK: {{ ahli.nik }}</div>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">3. Harta Warisan</h3>
          <ul class="list-disc pl-5 text-sm space-y-2 text-gray-700">
            <li v-for="(aset, idx) in appData.harta" :key="idx">
              <span class="font-semibold">{{ aset.jenis }}:</span> {{ aset.deskripsi }} 
              <span v-if="aset.bukti" class="text-gray-400 text-xs">({{ aset.bukti }})</span>
            </li>
          </ul>
        </div>

      </div>

      <div class="bg-gray-800 rounded-xl overflow-hidden flex flex-col shadow-lg h-full">
        
        <div class="bg-gray-900 p-2 flex justify-center gap-2 overflow-x-auto">
          <button 
            @click="activeDoc = 'ktp'" 
            class="px-4 py-2 rounded text-xs font-semibold transition-colors"
            :class="activeDoc === 'ktp' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
          >
            KTP Pewaris
          </button>
          <button 
            @click="activeDoc = 'kk'" 
            class="px-4 py-2 rounded text-xs font-semibold transition-colors"
            :class="activeDoc === 'kk' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
          >
            Kartu Keluarga
          </button>
          <button 
            @click="activeDoc = 'kematian'" 
            class="px-4 py-2 rounded text-xs font-semibold transition-colors"
            :class="activeDoc === 'kematian' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
          >
            Surat Kematian
          </button>
        </div>

        <div class="flex-1 bg-gray-700 flex items-center justify-center relative p-4 overflow-hidden">
          <img 
            :src="appData.documents[activeDoc]" 
            alt="Preview Dokumen" 
            class="max-h-full max-w-full object-contain shadow-2xl rounded"
          />
          
          <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
            Mode Pratinjau (Zoom: Fit)
          </div>
        </div>

      </div>

    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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