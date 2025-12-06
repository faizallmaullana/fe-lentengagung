<script setup>
import { ref, computed } from 'vue'
import Swal from 'sweetalert2'

// --- MOCK DATA ARSIP (Hanya yang status 'Selesai') ---
const archives = ref([
  { 
    noSurat: '470/001/III/2025', 
    pewaris: 'ALM. BUDI SANTOSO', 
    ahliWarisUtama: 'Siti Aminah', 
    tglSah: '2025-03-10', 
    file: 'spaw_budi_santoso.pdf'
  },
  { 
    noSurat: '470/015/II/2025', 
    pewaris: 'ALM. JOKO WIDODO', 
    ahliWarisUtama: 'Bambang Pamungkas', 
    tglSah: '2025-02-28', 
    file: 'spaw_joko_widodo.pdf'
  },
  { 
    noSurat: '470/088/I/2024', 
    pewaris: 'ALM. SITI NURHALIZA', 
    ahliWarisUtama: 'Rahmat Hidayat', 
    tglSah: '2024-12-15', 
    file: 'spaw_siti_nurhaliza.pdf'
  },
  { 
    noSurat: '470/092/XI/2024', 
    pewaris: 'ALM. DEDI KORBUZER', 
    ahliWarisUtama: 'Azka', 
    tglSah: '2024-11-20', 
    file: 'spaw_dedi.pdf'
  }
])

// --- STATE FILTER ---
const searchQuery = ref('')
const selectedYear = ref('')

// --- LOGIKA FILTERING (FS.S.02) ---
const filteredArchives = computed(() => {
  return archives.value.filter(doc => {
    const matchQuery = 
      doc.pewaris.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      doc.noSurat.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      doc.ahliWarisUtama.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchYear = selectedYear.value 
      ? doc.tglSah.startsWith(selectedYear.value) 
      : true

    return matchQuery && matchYear
  })
})

// --- ACTIONS ---
const handleDownload = (docName) => {
  Swal.fire({
    title: 'Mengambil Dokumen...',
    html: 'Sedang menyiapkan file enkripsi.',
    timer: 1500,
    timerProgressBar: true,
    didOpen: () => Swal.showLoading()
  }).then(() => {
    Swal.fire({
      icon: 'success',
      title: 'Unduhan Berhasil',
      text: `File ${docName} telah disimpan ke perangkat lokal.`,
      confirmButtonColor: '#16a34a'
    })
  })
}

const handlePrint = (docName) => {
  // Simulasi membuka dialog print browser
  Swal.fire({
    title: 'Mencetak...',
    text: `Menyiapkan antarmuka cetak untuk ${docName}`,
    icon: 'info',
    timer: 1000,
    showConfirmButton: false
  })
}
</script>

<template>
  <div class="space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Arsip Digital</h2>
        <p class="text-sm text-gray-500">Pangkalan data Surat Pernyataan Ahli Waris yang telah disahkan.</p>
      </div>
      
      <div class="flex gap-3">
        <select 
          v-model="selectedYear" 
          class="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Semua Tahun</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
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
            <th class="px-6 py-4">Nomor Surat</th>
            <th class="px-6 py-4">Nama Pewaris</th>
            <th class="px-6 py-4">Ahli Waris Utama</th>
            <th class="px-6 py-4">Tanggal Sah</th>
            <th class="px-6 py-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="(doc, index) in filteredArchives" :key="index" class="hover:bg-blue-50/30 transition-colors">
            <td class="px-6 py-4 font-mono text-blue-600 font-medium">{{ doc.noSurat }}</td>
            <td class="px-6 py-4 font-bold text-gray-800">{{ doc.pewaris }}</td>
            <td class="px-6 py-4">{{ doc.ahliWarisUtama }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-1 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {{ doc.tglSah }}
              </div>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-2">
                <button 
                  @click="handlePrint(doc.pewaris)"
                  class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-all"
                  title="Cetak Salinan"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 001.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                  </svg>
                </button>
                
                <button 
                  @click="handleDownload(doc.file)"
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

      <div v-if="filteredArchives.length === 0" class="p-10 text-center text-gray-400">
        <p>Tidak ada dokumen arsip yang cocok dengan filter.</p>
      </div>
    </div>

  </div>
</template>