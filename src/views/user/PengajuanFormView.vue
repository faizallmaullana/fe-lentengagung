<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import Tesseract from 'tesseract.js' 
import Swal from 'sweetalert2'

const router = useRouter()

// --- STATE ---
const currentStep = ref(1)
const steps = ['Data Pewaris', 'Data Ahli Waris', 'Harta Warisan', 'Upload Dokumen']
const progressWidth = computed(() => ((currentStep.value - 1) / (steps.length - 1)) * 100)

const isScanning = ref(false)
const scanProgress = ref(0)
const debugImage = ref(null) // Untuk melihat hasil pre-processing (opsional)

const form = reactive({
  pewaris: { nik: '', nama: '', tanggalMeninggal: '', alamat: '' },
  ahliWarisList: [{ nama: '', nik: '', hubungan: '' }],
  hartaList: [{ jenis: '', deskripsi: '', noSurat: '' }],
  files: { ktpPewaris: null, kk: null, suratKematian: null }
})

// --- [RAHASIA] 1. FUNGSI PRE-PROCESSING GAMBAR ---
// Mengubah gambar menjadi Hitam-Putih Kontras Tinggi agar AI mudah baca
const preprocessImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Algoritma Binarization (Thresholding)
        // Mengubah pixel jadi Hitam total atau Putih total untuk hilangkan background batik KTP
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          // Threshold 135 biasanya pas untuk KTP
          const color = avg > 135 ? 255 : 0 
          data[i] = color     // R
          data[i + 1] = color // G
          data[i + 2] = color // B
        }
        
        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  })
}

// --- 2. LOGIKA OCR UTAMA ---
const handleScanKTP = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  isScanning.value = true
  scanProgress.value = 0

  try {
    // A. Lakukan Pre-processing dulu
    const processedImage = await preprocessImage(file)
    // debugImage.value = processedImage // Uncomment jika ingin lihat hasil hitam putih

    // B. Jalankan Tesseract pada gambar yang sudah bersih
    const { data: { text } } = await Tesseract.recognize(
      processedImage, 
      'ind',
      { logger: m => { if (m.status === 'recognizing text') scanProgress.value = Math.floor(m.progress * 100) } }
    )

    console.log("Hasil OCR Mentah:", text) // Cek console untuk debugging

    // C. Parsing Pintar (Smart Regex)
    const lines = text.split('\n')
    
    // 1. Cari NIK (Cari 16 digit angka, abaikan spasi atau salah baca '?' dsb)
    // Regex ini mencari kumpulan 16 angka di seluruh teks
    const nikMatch = text.replace(/[^0-9]/g, '').match(/\d{16}/)
    if (nikMatch) {
        form.pewaris.nik = nikMatch[0]
    }

    // 2. Cari Nama & Alamat (Looping per baris)
    let namaFound = false
    let alamatFound = false

    lines.forEach((line, index) => {
      const cleanLine = line.trim().toUpperCase()

      // Deteksi Nama (Biasanya baris setelah kata "NAMA" atau di baris yang sama)
      if (!namaFound && cleanLine.includes('NAMA')) {
        // Coba ambil teks setelah titik dua ":"
        let extractedName = cleanLine.split(':')[1]
        
        // Jika kosong, mungkin namanya ada di baris BAWAHNYA
        if (!extractedName || extractedName.trim().length < 3) {
           if (lines[index + 1]) extractedName = lines[index + 1]
        }

        if (extractedName) {
            // Bersihkan karakter non-huruf yang tersisa
            form.pewaris.nama = extractedName.replace(/[^a-zA-Z\s]/g, '').trim()
            namaFound = true
        }
      }

      // Deteksi Alamat
      if (!alamatFound && cleanLine.includes('ALAMAT')) {
        let extractedAlamat = cleanLine.split(':')[1]
        // Jika di baris yang sama kosong, ambil baris bawahnya
        if (!extractedAlamat || extractedAlamat.trim().length < 3) {
           if (lines[index + 1]) extractedAlamat = lines[index + 1]
        }
        
        if (extractedAlamat) {
            // Bersihkan sedikit
            form.pewaris.alamat = extractedAlamat.replace(/[^a-zA-Z0-9\s.,/-]/g, '').trim()
            alamatFound = true
        }
      }
    })

    Swal.fire({
      icon: 'success', 
      title: 'Scan Selesai!', 
      text: 'Data NIK, Nama, dan Alamat berhasil dideteksi. Mohon koreksi jika ada kesalahan huruf.', 
      timer: 3000 
    })

  } catch (error) {
    console.error(error)
    Swal.fire('Gagal Scan', 'Kualitas gambar kurang baik. Silakan input manual.', 'error')
  } finally {
    isScanning.value = false
  }
}

// --- HELPER LAIN (Sama seperti sebelumnya) ---
const handleFileUpload = (event, key) => {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal 5MB', 'warning')
      event.target.value = '' 
      return
    }
    form.files[key] = file
  }
}

const addAhliWaris = () => { form.ahliWarisList.push({ nama: '', nik: '', hubungan: '' }) }
const removeAhliWaris = (index) => {
  if (form.ahliWarisList.length > 1) form.ahliWarisList.splice(index, 1)
  else Swal.fire('Gagal', 'Minimal 1 Ahli Waris.', 'warning')
}
const addHarta = () => { form.hartaList.push({ jenis: '', deskripsi: '', noSurat: '' }) }
const removeHarta = (index) => {
  if (form.hartaList.length > 1) form.hartaList.splice(index, 1)
  else Swal.fire('Gagal', 'Minimal 1 Aset.', 'warning')
}

// --- VALIDASI & NAVIGASI ---
const validateStep1 = () => {
  const { nik, nama, tanggalMeninggal, alamat } = form.pewaris
  if (!nik || !nama || !tanggalMeninggal || !alamat) { Swal.fire('Lengkapi Data', 'Semua data pewaris wajib diisi.', 'warning'); return false }
  if (String(nik).length !== 16) { Swal.fire('Format Salah', 'NIK harus 16 digit.', 'warning'); return false }
  return true
}
const validateStep2 = () => {
  for (let i = 0; i < form.ahliWarisList.length; i++) {
    const ahli = form.ahliWarisList[i]
    if (!ahli.nama || !ahli.nik || !ahli.hubungan) { Swal.fire('Data Kurang', `Ahli Waris ke-${i + 1} belum lengkap.`, 'warning'); return false }
    if (String(ahli.nik).length !== 16) { Swal.fire('Format Salah', `NIK Ahli Waris ke-${i + 1} harus 16 digit.`, 'warning'); return false }
  }
  return true
}
const validateStep3 = () => {
  for (let i = 0; i < form.hartaList.length; i++) {
    if (!form.hartaList[i].jenis || !form.hartaList[i].deskripsi) { Swal.fire('Data Kurang', `Harta ke-${i + 1} belum lengkap.`, 'warning'); return false }
  }
  return true
}
const validateStep4 = () => {
  const { ktpPewaris, kk, suratKematian } = form.files
  if (!ktpPewaris || !kk || !suratKematian) { Swal.fire('Dokumen Kurang', 'Wajib upload semua dokumen.', 'warning'); return false }
  return true
}

const nextStep = () => {
  if (currentStep.value === 1 && !validateStep1()) return
  if (currentStep.value === 2 && !validateStep2()) return
  if (currentStep.value === 3 && !validateStep3()) return
  if (currentStep.value < 4) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
const submitForm = async () => {
  if (!validateStep4()) return
  const result = await Swal.fire({
    title: 'Kirim Permohonan?',
    text: "Pastikan data sudah benar. Data tidak dapat diubah.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#16a34a',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Ya, Kirim!'
  })
  if (result.isConfirmed) {
      Swal.fire({ title: 'Mengirim...', didOpen: () => Swal.showLoading() })
      await new Promise(r => setTimeout(r, 1500))
      await Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Permohonan terkirim.', confirmButtonColor: '#16a34a' })
      router.push('/dashboard')
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto pb-20">
    
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Formulir Pengajuan Waris</h1>
      <div class="flex items-center justify-between relative">
        <div class="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
        <div class="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-green-600 -z-10 transition-all duration-500 ease-out" :style="{ width: `${progressWidth}%` }"></div>
        <div v-for="(step, index) in steps" :key="index" class="flex flex-col items-center bg-gray-50 px-2 z-10">
          <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 border-2" :class="currentStep > index + 1 ? 'bg-green-600 text-white border-green-600 scale-110' : (currentStep === index + 1 ? 'bg-white text-green-600 border-green-600 scale-110 shadow-lg' : 'bg-white text-gray-300 border-gray-300')">
            <span v-if="currentStep > index + 1">✓</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span class="text-xs font-medium mt-2 text-center hidden sm:block w-24" :class="currentStep >= index + 1 ? 'text-green-700 font-bold' : 'text-gray-400'">{{ step }}</span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      
      <div v-if="currentStep === 1" class="space-y-6 animate-fade-in">
        <h2 class="text-lg font-bold text-gray-800 border-b pb-2">Informasi Pewaris</h2>
        
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center">
            <p class="text-sm text-blue-800 font-medium mb-4">💡 Tips: Gunakan foto KTP yang terang dan tegak lurus.</p>
            <label class="cursor-pointer inline-flex flex-col items-center px-6 py-3 border-2 border-dashed border-blue-300 rounded-lg bg-white hover:bg-blue-50 transition-colors">
                <input type="file" accept="image/*" class="hidden" @change="handleScanKTP" :disabled="isScanning" />
                <div v-if="!isScanning" class="text-blue-600 font-bold flex gap-2 items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Scan KTP Otomatis (Beta)
                </div>
                <div v-else class="text-blue-600 animate-pulse font-medium">Sedang Memproses AI... {{ scanProgress }}%</div>
            </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label class="block text-xs font-bold text-gray-500 mb-1">NIK Pewaris *</label><input v-model="form.pewaris.nik" type="number" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="16 Digit" /></div>
            <div><label class="block text-xs font-bold text-gray-500 mb-1">Nama Lengkap *</label><input v-model="form.pewaris.nama" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="Hasil Scan..." /></div>
            <div><label class="block text-xs font-bold text-gray-500 mb-1">Tanggal Meninggal *</label><input v-model="form.pewaris.tanggalMeninggal" type="date" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" />
            <p class="text-xs text-orange-500 mt-1">* Wajib isi manual (tidak ada di KTP)</p>
            </div>
            <div><label class="block text-xs font-bold text-gray-500 mb-1">Alamat Terakhir *</label><input v-model="form.pewaris.alamat" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="Hasil Scan..." /></div>
        </div>
      </div>

      <div v-if="currentStep === 2" class="space-y-6 animate-fade-in">
        <div class="flex justify-between items-center border-b pb-2"><h2 class="text-lg font-bold text-gray-800">Ahli Waris</h2><button @click="addAhliWaris" class="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200">+ Tambah</button></div>
        <div v-for="(ahli, index) in form.ahliWarisList" :key="index" class="bg-gray-50 p-4 rounded-lg border relative">
            <button v-if="form.ahliWarisList.length > 1" @click="removeAhliWaris(index)" class="absolute top-2 right-2 text-red-400 hover:text-red-600">✕</button>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label class="text-xs font-bold text-gray-500">Nama *</label><input v-model="ahli.nama" class="w-full px-3 py-2 border rounded text-sm mt-1" /></div>
                <div><label class="text-xs font-bold text-gray-500">NIK *</label><input v-model="ahli.nik" type="number" class="w-full px-3 py-2 border rounded text-sm mt-1" /></div>
                <div><label class="text-xs font-bold text-gray-500">Hubungan *</label><select v-model="ahli.hubungan" class="w-full px-3 py-2 border rounded text-sm mt-1 bg-white"><option disabled value="">Pilih</option><option>Istri/Suami</option><option>Anak Kandung</option><option>Cucu</option><option>Saudara Kandung</option></select></div>
            </div>
        </div>
      </div>

      <div v-if="currentStep === 3" class="space-y-6 animate-fade-in">
        <div class="flex justify-between items-center border-b pb-2"><h2 class="text-lg font-bold text-gray-800">Harta Warisan</h2><button @click="addHarta" class="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200">+ Tambah</button></div>
        <div v-for="(harta, index) in form.hartaList" :key="index" class="bg-gray-50 p-4 rounded-lg border relative">
            <button v-if="form.hartaList.length > 1" @click="removeHarta(index)" class="absolute top-2 right-2 text-red-400 hover:text-red-600">✕</button>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label class="text-xs font-bold text-gray-500">Jenis *</label><select v-model="harta.jenis" class="w-full px-3 py-2 border rounded text-sm mt-1 bg-white"><option disabled value="">Pilih</option><option>Tanah/Bangunan</option><option>Kendaraan</option><option>Tabungan</option><option>Lainnya</option></select></div>
                <div><label class="text-xs font-bold text-gray-500">Keterangan *</label><input v-model="harta.deskripsi" placeholder="Lokasi/Merk" class="w-full px-3 py-2 border rounded text-sm mt-1" /></div>
                <div><label class="text-xs font-bold text-gray-500">No. Bukti</label><input v-model="harta.noSurat" placeholder="Sertifikat/BPKB" class="w-full px-3 py-2 border rounded text-sm mt-1" /></div>
            </div>
        </div>
      </div>

      <div v-if="currentStep === 4" class="space-y-6 animate-fade-in">
        <h2 class="text-lg font-bold text-gray-800 border-b pb-2">Dokumen Pendukung</h2>
        <div class="space-y-4">
            <div><label class="text-sm font-medium">Scan KTP Pewaris (Asli) *</label><input @change="e => handleFileUpload(e, 'ktpPewaris')" type="file" class="block w-full text-sm text-slate-500 mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/></div>
            <div><label class="text-sm font-medium">Kartu Keluarga (KK) *</label><input @change="e => handleFileUpload(e, 'kk')" type="file" class="block w-full text-sm text-slate-500 mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/></div>
            <div><label class="text-sm font-medium">Surat Kematian *</label><input @change="e => handleFileUpload(e, 'suratKematian')" type="file" class="block w-full text-sm text-slate-500 mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/></div>
        </div>
      </div>

      <div class="mt-8 flex justify-between pt-6 border-t border-gray-100">
        <button v-if="currentStep > 1" @click="prevStep" class="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">Kembali</button>
        <div v-else></div> 
        <button v-if="currentStep < 4" @click="nextStep" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg">Lanjut</button>
        <button v-else @click="submitForm" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg">Kirim Permohonan</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>