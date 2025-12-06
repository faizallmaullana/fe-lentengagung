<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import Tesseract from 'tesseract.js'
import Swal from 'sweetalert2'

const router = useRouter()

const currentStep = ref(1)
const steps = ['Data Pewaris', 'Data Ahli Waris', 'Upload Dokumen']
const isScanning = ref(false)
const scanProgress = ref(0)

const form = reactive({
  pewaris: { nik: '', nama: '', tanggalMeninggal: '', alamat: '' },
  ahliWarisList: [{ nama: '', nik: '', hubungan: '' }],
  files: { ktpPewaris: null, kk: null, suratKematian: null }
})

const handleFileUpload = (event, key) => {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal ukuran file adalah 5MB', 'warning')
      event.target.value = ''
      return
    }
    form.files[key] = file
  }
}

const handleScanKTP = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  isScanning.value = true
  scanProgress.value = 0

  try {
    const { data: { text } } = await Tesseract.recognize(
      file, 'ind',
      { logger: m => { if (m.status === 'recognizing text') scanProgress.value = Math.floor(m.progress * 100) } }
    )
    const nikMatch = text.match(/\d{16}/)
    if (nikMatch) form.pewaris.nik = nikMatch[0]
    const lines = text.split('\n')
    const nameLine = lines.find(line => line.toLowerCase().includes('nama'))
    if (nameLine) {
      let cleanName = nameLine.replace(/nama/i, '').replace(/:/g, '').trim()
      cleanName = cleanName.replace(/^[^a-zA-Z]+/, '')
      form.pewaris.nama = cleanName.toUpperCase()
    }
    Swal.fire({
      icon: 'success', title: 'Scan Selesai', text: 'Silakan periksa kembali data yang terisi.', timer: 2000, showConfirmButton: false
    })
  } catch (error) {
    Swal.fire('Gagal Scan', 'Tidak dapat memindai KTP. Silakan input manual.', 'error')
  } finally {
    isScanning.value = false
  }
}

const addAhliWaris = () => { form.ahliWarisList.push({ nama: '', nik: '', hubungan: '' }) }
const removeAhliWaris = (index) => {
  if (form.ahliWarisList.length > 1) {
    form.ahliWarisList.splice(index, 1)
  } else {
    Swal.fire('Gagal Hapus', 'Minimal harus ada 1 Ahli Waris.', 'warning')
  }
}

const validateStep1 = () => {
  const { nik, nama, tanggalMeninggal, alamat } = form.pewaris
  if (!nik || !nama || !tanggalMeninggal || !alamat) {
    Swal.fire('Data Belum Lengkap', 'Mohon lengkapi semua Data Pewaris.', 'warning')
    return false
  }
  if (String(nik).length !== 16) {
    Swal.fire('Format Salah', 'NIK Pewaris harus 16 digit angka.', 'warning')
    return false
  }
  return true
}

const validateStep2 = () => {
  for (let i = 0; i < form.ahliWarisList.length; i++) {
    const ahli = form.ahliWarisList[i]
    if (!ahli.nama || !ahli.nik || !ahli.hubungan) {
      Swal.fire('Data Belum Lengkap', `Data Ahli Waris ke-${i + 1} belum lengkap.`, 'warning')
      return false
    }
    if (String(ahli.nik).length !== 16) {
      Swal.fire('Format Salah', `NIK Ahli Waris ke-${i + 1} harus 16 digit.`, 'warning')
      return false
    }
  }
  return true
}

const validateStep3 = () => {
  const { ktpPewaris, kk, suratKematian } = form.files
  if (!ktpPewaris || !kk || !suratKematian) {
    Swal.fire('Dokumen Kurang', 'Mohon upload KTP, KK, dan Surat Kematian.', 'warning')
    return false
  }
  return true
}

const nextStep = () => {
  if (currentStep.value === 1 && !validateStep1()) return
  if (currentStep.value === 2 && !validateStep2()) return
  if (currentStep.value < 3) {
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
  if (!validateStep3()) return

  // 3. CONFIRM DIALOG
  const result = await Swal.fire({
    title: 'Kirim Permohonan?',
    text: "Pastikan data sudah benar. Data tidak dapat diubah setelah dikirim.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#16a34a',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Ya, Kirim Sekarang!',
    cancelButtonText: 'Batal'
  })

  if (result.isConfirmed) {
      Swal.fire({
        title: 'Sedang Mengirim...',
        html: 'Mohon tunggu sebentar.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
      })
      
      await new Promise(resolve => setTimeout(resolve, 1500))

      await Swal.fire({
        icon: 'success',
        title: 'Terkirim!',
        text: 'Permohonan Anda berhasil diajukan.',
        confirmButtonColor: '#16a34a'
      })

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
        <div v-for="(step, index) in steps" :key="index" class="flex flex-col items-center bg-gray-50 px-2">
          <div 
            class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 border-2"
            :class="currentStep > index + 1 ? 'bg-green-600 text-white border-green-600' : (currentStep === index + 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-300')" 
          >
            <span v-if="currentStep > index + 1">✓</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span class="text-xs font-medium mt-2" :class="currentStep === index + 1 ? 'text-blue-700' : 'text-gray-500'">
            {{ step }}
          </span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div v-if="currentStep === 1" class="space-y-6 animate-fade-in">
         <h2 class="text-lg font-bold text-gray-800 border-b pb-2">Informasi Pewaris (Almarhum)</h2>
         <div class="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center">
            <p class="text-sm text-blue-800 font-medium mb-4">💡 Tips: Upload foto KTP Almarhum untuk isi data otomatis</p>
            <label class="cursor-pointer inline-flex flex-col items-center justify-center px-6 py-3 border-2 border-dashed border-blue-300 rounded-lg bg-white hover:bg-blue-50 transition-colors">
                <input type="file" accept="image/*" class="hidden" @change="handleScanKTP" :disabled="isScanning" />
                <div v-if="!isScanning" class="flex items-center gap-2 text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    </svg>
                    <span class="font-bold">Scan KTP Otomatis (OCR)</span>
                </div>
                <div v-else class="text-blue-600">
                    <span class="animate-pulse">Memindai Teks... {{ scanProgress }}%</span>
                </div>
            </label>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">NIK Pewaris <span class="text-red-500">*</span></label><input v-model="form.pewaris.nik" type="number" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="16 digit NIK" required /></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span class="text-red-500">*</span></label><input v-model="form.pewaris.nama" type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="Sesuai KTP" required /></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Meninggal <span class="text-red-500">*</span></label><input v-model="form.pewaris.tanggalMeninggal" type="date" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500" required /></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Alamat Terakhir <span class="text-red-500">*</span></label><input v-model="form.pewaris.alamat" type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="Alamat lengkap..." required /></div>
        </div>
      </div>

      <div v-if="currentStep === 2" class="space-y-6 animate-fade-in">
         <div class="flex justify-between items-center border-b pb-2"><h2 class="text-lg font-bold text-gray-800">Daftar Ahli Waris</h2><button @click="addAhliWaris" class="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 flex items-center gap-1">+ Tambah Orang</button></div>
        <div v-for="(ahli, index) in form.ahliWarisList" :key="index" class="bg-gray-50 p-4 rounded-lg border border-gray-200 relative group transition-all">
            <button v-if="form.ahliWarisList.length > 1" @click="removeAhliWaris(index)" class="absolute top-2 right-2 text-red-400 hover:text-red-600 bg-white rounded-full p-1 shadow-sm" title="Hapus"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            <h3 class="text-sm font-bold text-gray-500 mb-3">Ahli Waris #{{ index + 1 }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label class="block text-xs font-semibold text-gray-500 mb-1">Nama <span class="text-red-500">*</span></label><input v-model="ahli.nama" type="text" placeholder="Nama Lengkap" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label class="block text-xs font-semibold text-gray-500 mb-1">NIK <span class="text-red-500">*</span></label><input v-model="ahli.nik" type="number" placeholder="NIK (16 Digit)" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label class="block text-xs font-semibold text-gray-500 mb-1">Hubungan <span class="text-red-500">*</span></label><select v-model="ahli.hubungan" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"><option value="" disabled selected>Pilih Hubungan</option><option>Istri/Suami</option><option>Anak Kandung</option><option>Cucu</option><option>Saudara Kandung</option></select></div>
            </div>
        </div>
      </div>

      <div v-if="currentStep === 3" class="space-y-6 animate-fade-in">
         <h2 class="text-lg font-bold text-gray-800 border-b pb-2">Upload Dokumen Pendukung</h2>
        <div class="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg mb-4 flex gap-2"><span>⚠️</span><span>Pastikan dokumen yang diunggah jelas, terbaca, dan dalam format <b>PDF atau JPEG</b> (Maks 5MB).</span></div>
        <div class="space-y-5">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Scan KTP Pewaris (Asli) <span class="text-red-500">*</span></label><div class="flex items-center gap-3"><input @change="event => handleFileUpload(event, 'ktpPewaris')" type="file" accept=".pdf,.jpg,.jpeg,.png" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" /><span v-if="form.files.ktpPewaris" class="text-green-600 text-xs font-bold">✓ Terisi</span></div></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Kartu Keluarga (KK) <span class="text-red-500">*</span></label><div class="flex items-center gap-3"><input @change="event => handleFileUpload(event, 'kk')" type="file" accept=".pdf,.jpg,.jpeg,.png" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" /><span v-if="form.files.kk" class="text-green-600 text-xs font-bold">✓ Terisi</span></div></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Surat Kematian dari RS/Kelurahan <span class="text-red-500">*</span></label><div class="flex items-center gap-3"><input @change="event => handleFileUpload(event, 'suratKematian')" type="file" accept=".pdf,.jpg,.jpeg,.png" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" /><span v-if="form.files.suratKematian" class="text-green-600 text-xs font-bold">✓ Terisi</span></div></div>
        </div>
      </div>

      <div class="mt-8 flex justify-between pt-6 border-t border-gray-100">
        <button v-if="currentStep > 1" @click="prevStep" class="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">Kembali</button>
        <div v-else></div> 
        <button v-if="currentStep < 3" @click="nextStep" class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">Lanjut Langkah {{ currentStep + 1 }}</button>
        <button v-else @click="submitForm" class="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20">Kirim Permohonan</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>