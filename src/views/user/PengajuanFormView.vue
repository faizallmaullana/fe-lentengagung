<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// Client-side OCR removed: we send file to server OCR endpoint instead
import Swal from 'sweetalert2'
// Import axios instance
import api from '@/axios'

const router = useRouter()

// --- STATE ---
const currentStep = ref(1)
const steps = ['Data Pewaris', 'Data Ahli Waris', 'Harta Warisan', 'Upload Dokumen']
const progressWidth = computed(() => ((currentStep.value - 1) / (steps.length - 1)) * 100)

const isApproved = ref(false) // Track apakah user sudah klik approval
const formId = ref(null) // ID dari form yang dibuat via API
const isChecking = ref(true) // Track apakah sedang check existing forms
const isScanning = ref(false)
const scanProgress = ref(0)
const debugImage = ref(null) // Untuk melihat hasil pre-processing (opsional)
const parsedPreview = ref(null) // preview dari hasil OCR sebelum/selesai autofill
const preparedJson = ref(null)
const submissionPayload = ref(null)

const newEmptyAhli = () => ({ nama: '', nik: '', hubungan: '', ktpFile: null })
const newEmptyHarta = () => ({ jenis: '', deskripsi: '', noSurat: '' })

const form = reactive({
  pewaris: {
    nik: '',
    nama: '',
    tanggalMeninggal: '',
    alamat: '',
    agama: '',
    golonganDarah: '',
    jenisKelamin: '',
    kecamatan: '',
    kelurahanAtauDesa: '',
    kewarganegaraan: '',
    pekerjaan: '',
    rt: '',
    rw: '',
    statusPerkawinan: '',
    tanggalLahir: '',
    tempatLahir: ''
  },
  ahliWarisList: [newEmptyAhli()],
  hartaList: [newEmptyHarta()],
  files: { ktpPewaris: null, kk: null, suratKematian: null }
})

const resetFormSection = () => {
  form.pewaris.nik = ''
  form.pewaris.nama = ''
  form.pewaris.tanggalMeninggal = ''
  form.pewaris.alamat = ''
  form.pewaris.agama = ''
  form.pewaris.golonganDarah = ''
  form.pewaris.jenisKelamin = ''
  form.pewaris.kecamatan = ''
  form.pewaris.kelurahanAtauDesa = ''
  form.pewaris.kewarganegaraan = ''
  form.pewaris.pekerjaan = ''
  form.pewaris.rt = ''
  form.pewaris.rw = ''
  form.pewaris.statusPerkawinan = ''
  form.pewaris.tanggalLahir = ''
  form.pewaris.tempatLahir = ''
  form.ahliWarisList.splice(0, form.ahliWarisList.length, newEmptyAhli())
  form.hartaList.splice(0, form.hartaList.length, newEmptyHarta())
  form.files.ktpPewaris = null
  form.files.kk = null
  form.files.suratKematian = null
  parsedPreview.value = null
  preparedJson.value = null
  submissionPayload.value = null
}

const findKeyValue = (obj, keys) => {
  if (!obj) return null
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key]
    const upper = obj[key.toUpperCase()]
    if (upper) return upper
  }
  return null
}

const normalizeText = (value) => {
  if (value == null) return null
  let text = String(value)
  text = text.trim()
  text = text.replace(/^[:\s]+/, '')
  text = text.replace(/[\s]+$/, '')
  return text
}

const extractNikFromParsed = (parsed) => {
  if (!parsed) return null
  let candidate = findKeyValue(parsed, ['nik', 'no_ktp', 'nomor_ktp', 'noktp', 'no'])
  if (candidate) candidate = normalizeText(candidate).replace(/[^0-9]/g, '')
  if (!candidate) {
    const joined = Object.values(parsed).join(' ')
    const digits = joined.replace(/[^0-9]/g, '')
    const match = digits.match(/\d{16}/)
    if (match) candidate = match[0]
  }
  if (!candidate) return null
  const str = String(candidate)
  return str.length > 16 ? str.slice(0, 16) : str
}

const extractNameFromParsed = (parsed) => {
  const raw = findKeyValue(parsed, ['nama', 'name', 'full_name'])
  if (!raw) return null
  let normalized = normalizeText(raw)
  normalized = normalized.replace(/^[^a-zA-Z]*/, '')
  normalized = normalized.replace(/[^a-zA-Z\s\-']/g, '')
  return normalized.trim() || null
}

const mapFieldsToTarget = (target, parsed, fieldMap) => {
  Object.entries(fieldMap).forEach(([field, keys]) => {
    const value = findKeyValue(parsed, keys)
    if (value) {
      target[field] = normalizeText(value)
    }
  })
}

const sharedFieldMap = {
  alamat: ['alamat', 'address'],
  agama: ['agama'],
  golonganDarah: ['golongan_darah', 'golonganDarah'],
  jenisKelamin: ['jenis_kelamin', 'jenisKelamin'],
  kecamatan: ['kecamatan'],
  kelurahanAtauDesa: ['kelurahan_atau_desa', 'kelurahanAtauDesa'],
  kewarganegaraan: ['kewarganegaraan'],
  pekerjaan: ['pekerjaan'],
  rt: ['rt'],
  rw: ['rw'],
  statusPerkawinan: ['status_perkawinan', 'statusPerkawinan'],
  tanggalLahir: ['tanggal_lahir', 'tanggalLahir'],
  tempatLahir: ['tempat_lahir', 'tempatLahir']
}

const unwrapOcrPayload = (payload) => {
  if (!payload) return { data: null, fileName: null }
  if (payload.file_name && payload.ocr) {
    return { fileName: payload.file_name, data: payload.ocr }
  }
  return { data: payload, fileName: null }
}

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

// Apply parsed OCR object to form pewaris fields with tolerant key mapping
const applyOcrToEntity = (target, data) => {
  if (!target || !data) return
  const nikValue = extractNikFromParsed(data)
  if (nikValue) target.nik = nikValue
  const nameValue = extractNameFromParsed(data)
  if (nameValue) target.nama = nameValue
  mapFieldsToTarget(target, data, sharedFieldMap)
}

const applyOcrParsed = (payload) => {
  if (!payload) return
  const { data, fileName } = unwrapOcrPayload(payload)
  if (!data) return

  applyOcrToEntity(form.pewaris, data)

  parsedPreview.value = {
    file_name: fileName || null,
    nik: form.pewaris.nik || null,
    nama: form.pewaris.nama || null,
    alamat: form.pewaris.alamat || null,
    raw: data
  }
}

const applyOcrToAhli = (payload, index) => {
  if (!payload) return
  const ahli = form.ahliWarisList[index]
  if (!ahli) return
  const { data } = unwrapOcrPayload(payload)
  if (!data) return

  applyOcrToEntity(ahli, data)
}

// For testing: load sample JSON and apply to form
const fillFromOcrJson = (payload, { showAlert = true, copyPayload = true } = {}) => {
  if (!payload) return
  const wrapper = payload.ocr ? payload : { file_name: payload.file_name, ocr: payload }
  resetFormSection()
  preparedJson.value = wrapper
  submissionPayload.value = wrapper
  applyOcrParsed(wrapper)

  if (copyPayload) {
    try {
      const txt = JSON.stringify(wrapper)
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt)
      }
    } catch (e) {
      console.warn('Clipboard copy failed', e)
    }
  }

  if (showAlert) {
    Swal.fire({ icon: 'success', title: 'Contoh Diisi', text: 'Data pewaris dan payload JSON telah disiapkan dan disalin (jika didukung).' })
  }
}

const parseOcrPayload = (payload) => {
  if (!payload) return null
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload)
    } catch (error) {
      console.warn('Tidak dapat mengurai payload OCR string', error)
      return null
    }
  }
  if (typeof payload === 'object') return payload
  return null
}

const resolveOcrPayload = (apiResponse) => {
  if (!apiResponse) return null

  const parsed = parseOcrPayload(apiResponse.response ?? apiResponse)
  if (!parsed) return null

  const unwrap = (payload) => {
    if (!payload) return null
    if (payload.ocr || payload.file_name) return payload
    if (payload.data && typeof payload.data === 'object') {
      const inner = unwrap(payload.data)
      if (inner) return inner
    }
    if (payload.response && typeof payload.response === 'object') {
      const inner = unwrap(payload.response)
      if (inner) return inner
    }
    return payload
  }

  return unwrap(parsed)
}

const loadSampleJson = () => {
  const sample = {"file_name":"ktp_693c6342f6af_1768169313_Scan_KTP.JPG","ocr":{"agama":": ISLAM","alamat":"1 JL KECAPI V","golongan_darah":"-","jenis_kelamin":"PEREMPUAN","kecamatan":"JAGAKARSA","kelurahan_atau_desa":"JAGAKARSA","kewarganegaraan":"WNI a 1 221 1","nama":"1 DEBBY ANGGRAINI","nik":"31?4096112100001","pekerjaan":": KARYAWAN SWASTA JAKARTA SELATAN","rt":"1006","rw":"005","status_perkawinan":" BELUM KAWIN","tanggal_lahir":"21-12-1990","tempat_lahir":" JAKARTA, "}}
  fillFromOcrJson(sample)
}

// --- 2. LOGIKA OCR UTAMA ---
const handleScanKTP = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  isScanning.value = true
  scanProgress.value = 0

  try {
    Swal.fire({ title: 'Mengunggah dan memproses OCR...', didOpen: () => Swal.showLoading() })
    const fd = new FormData()
    fd.append('file', file)

    // Always send to OCR endpoint as requested
    const res = await api.post('/upload/ocr/ktp', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const parsed = resolveOcrPayload(res?.data)

    // Simpan file reference so user can still submit
    form.files.ktpPewaris = file

    if (parsed) {
      applyOcrParsed(parsed)
      Swal.fire({ icon: 'success', title: 'OCR Sukses', text: 'Data KTP terisi otomatis. Mohon periksa kembali.' })
    } else {
      Swal.fire({ icon: 'info', title: 'OCR Tidak Tersedia', text: 'File tersimpan, silakan isi data manual.' })
    }
  } catch (error) {
    console.error('OCR upload failed', error)
    Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: 'Terjadi kesalahan saat mengunggah atau memproses OCR.' })
    form.files.ktpPewaris = file
  } finally {
    try { Swal.close() } catch (e) {}
    isScanning.value = false
  }
}

// --- HELPER LAIN (Sama seperti sebelumnya) ---
const handleFileUpload = async (event, key) => {
  const file = event.target.files[0]
  if (!file) return

  isScanning.value = true
  scanProgress.value = 0

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire('File Terlalu Besar', 'Maksimal 5MB', 'warning')
    event.target.value = '' 
    isScanning.value = false
    return
  }

  // Jika KTP pewaris: upload ke endpoint OCR dan isi form otomatis jika memungkinkan
  if (key === 'ktpPewaris') {
    try {
      Swal.fire({ title: 'Mengunggah dan memproses OCR...', didOpen: () => Swal.showLoading() })
      const fd = new FormData()
      fd.append('file', file)

      const res = await api.post('/upload/ocr/ktp', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const parsed = resolveOcrPayload(res?.data)

      // Simpan file reference and/or filename
      form.files[key] = file

      if (parsed) {
        applyOcrParsed(parsed)
        Swal.fire({ icon: 'success', title: 'OCR Sukses', text: 'Data KTP terisi otomatis. Mohon periksa kembali.' })
      } else {
        Swal.fire({ icon: 'info', title: 'OCR Tidak Tersedia', text: 'File tersimpan, silakan isi data manual.' })
      }
    } catch (error) {
      console.error('OCR upload failed', error)
      Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: 'Terjadi kesalahan saat mengunggah atau memproses OCR.' })
      // simpan file locally so user can still submit
      form.files[key] = file
    } finally {
      try { Swal.close() } catch (e) {}
      isScanning.value = false
    }

    return
  }

  // Default: hanya simpan file
  form.files[key] = file
  isScanning.value = false
}

const handleAhliKtpUpload = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return
  const ahli = form.ahliWarisList[index]
  if (!ahli) return

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire('File Terlalu Besar', 'Maksimal 5MB', 'warning')
    event.target.value = ''
    return
  }

  isScanning.value = true
  scanProgress.value = 0

  try {
    Swal.fire({ title: 'Mengunggah dan memproses OCR...', didOpen: () => Swal.showLoading() })
    const fd = new FormData()
    fd.append('file', file)

    const res = await api.post('/upload/ocr/ktp', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const parsed = resolveOcrPayload(res?.data)

    ahli.ktpFile = file

    if (parsed) {
      applyOcrToAhli(parsed, index)
      Swal.fire({ icon: 'success', title: 'OCR Sukses', text: 'Nama dan NIK ahli waris terisi otomatis.' })
    } else {
      Swal.fire({ icon: 'info', title: 'OCR Tidak Tersedia', text: 'File tersimpan, silakan isi data manual.' })
    }
  } catch (error) {
    console.error('OCR upload failed for ahli', error)
    Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: 'Terjadi kesalahan saat mengunggah atau memproses OCR.' })
    ahli.ktpFile = file
  } finally {
    try { Swal.close() } catch (e) {}
    isScanning.value = false
    event.target.value = ''
  }
}

const addAhliWaris = () => { form.ahliWarisList.push(newEmptyAhli()) }
const removeAhliWaris = (index) => {
  if (form.ahliWarisList.length > 1) form.ahliWarisList.splice(index, 1)
  else Swal.fire('Gagal', 'Minimal 1 Ahli Waris.', 'warning')
}
const addHarta = () => { form.hartaList.push(newEmptyHarta()) }
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
    text: `Pastikan data sudah benar. Data tidak dapat diubah. Form ID: ${formId.value}`,
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

// --- APPROVAL HANDLER ---
const handleApproval = async () => {
  try {
    // Hit API /api/form/create
    const response = await api.post('/form/create')
    console.log('Form created:', response.data)
    
    // Simpan formId
    formId.value = response.data.id
    
    // Jika berhasil, lanjut ke form
    isApproved.value = true
  } catch (error) {
    console.error('Error creating form:', error)
    Swal.fire({
      icon: 'error',
      title: 'Gagal Membuat Form',
      text: error.response?.data?.error || 'Terjadi kesalahan saat membuat form. Silakan coba lagi.',
      confirmButtonColor: '#3085d6'
    })
  }
}

// --- CHECK EXISTING FORMS ---
const checkExistingForms = async () => {
  try {
    const response = await api.get('/form/')
    const data = response?.data
    console.log('Existing forms:', data)

    // Support multiple response shapes: array, single object, or { data: [...] }
    let exists = false
    if (Array.isArray(data) && data.length > 0) {
      formId.value = data[0].id
      exists = true
    } else if (data && data.id) {
      formId.value = data.id
      exists = true
    } else if (data && Array.isArray(data.data) && data.data.length > 0) {
      formId.value = data.data[0].id
      exists = true
    } else if (data && data.data && data.data.id) {
      formId.value = data.data.id
      exists = true
    }

    if (exists) {
      isApproved.value = true
    }
    // Jika tidak ada, tetap tampilkan halaman persetujuan
  } catch (error) {
    console.error('Error checking existing forms:', error)
    // Jika error, tetap tampilkan persetujuan (aman)
  } finally {
    isChecking.value = false
  }
}

// Lifecycle
onMounted(() => {
  checkExistingForms()
})
</script>

<template>
  <div class="max-w-4xl mx-auto pb-20">
    
    <!-- Loading saat check existing forms -->
    <div v-if="isChecking" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Memeriksa status pengajuan...</p>
    </div>

    <!-- Halaman Approval -->
    <div v-else-if="!isApproved" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Persetujuan Pengajuan Waris</h1>
      <div class="mb-8">
        <p class="text-gray-700 mb-4">
          Sebelum melanjutkan pengajuan, Anda harus menyetujui syarat dan ketentuan berikut:
        </p>
        <div class="bg-gray-50 p-6 rounded-lg text-left max-w-2xl mx-auto">
          <p class="text-sm text-gray-600 leading-relaxed">
            Saya bersedia mengikuti proses pengajuan waris dengan benar dan bertanggung jawab. Saya menyatakan bahwa semua data yang saya berikan adalah benar dan sesuai dengan dokumen asli. Saya memahami bahwa pengajuan ini akan diproses sesuai dengan peraturan yang berlaku di Kelurahan Lenteng Agung.
          </p>
        </div>
      </div>
      <button @click="handleApproval" class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg font-medium">
        Saya Bersedia Mengikuti Proses Pengajuan
      </button>
    </div>

    <!-- Form Pengajuan -->
    <div v-else>
    
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
            <div class="mt-3 flex flex-col gap-2">
              <button @click="loadSampleJson" type="button" class="text-sm text-blue-600 underline">Isi dari JSON contoh</button>
              <button @click="resetFormSection" type="button" class="text-sm text-gray-500 hover:text-gray-800">Kosongkan form untuk input KTP</button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label class="block text-xs font-bold text-gray-500 mb-1">NIK Pewaris *</label><input v-model="form.pewaris.nik" type="number" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="16 Digit" /></div>
            <div><label class="block text-xs font-bold text-gray-500 mb-1">Nama Lengkap *</label><input v-model="form.pewaris.nama" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="Hasil Scan..." /></div>
            <div><label class="block text-xs font-bold text-gray-500 mb-1">Tanggal Meninggal *</label><input v-model="form.pewaris.tanggalMeninggal" type="date" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" />
            <p class="text-xs text-orange-500 mt-1">* Wajib isi manual (tidak ada di KTP)</p>
            </div>
            <div><label class="block text-xs font-bold text-gray-500 mb-1">Alamat Terakhir *</label><input v-model="form.pewaris.alamat" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="Hasil Scan..." /></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Agama</label><input v-model="form.pewaris.agama" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Jenis Kelamin</label><input v-model="form.pewaris.jenisKelamin" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Golongan Darah</label><input v-model="form.pewaris.golonganDarah" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Pekerjaan</label><input v-model="form.pewaris.pekerjaan" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Kecamatan</label><input v-model="form.pewaris.kecamatan" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Kelurahan/Desa</label><input v-model="form.pewaris.kelurahanAtauDesa" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Kewarganegaraan</label><input v-model="form.pewaris.kewarganegaraan" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Status Perkawinan</label><input v-model="form.pewaris.statusPerkawinan" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label class="block text-xs font-bold text-gray-500 mb-1">RT</label><input v-model="form.pewaris.rt" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">RW</label><input v-model="form.pewaris.rw" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Tanggal Lahir</label><input v-model="form.pewaris.tanggalLahir" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="DD-MM-YYYY" /></div>
          <div><label class="block text-xs font-bold text-gray-500 mb-1">Tempat Lahir</label><input v-model="form.pewaris.tempatLahir" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500" /></div>
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
          <div class="mt-4">
            <label class="text-xs font-semibold text-gray-600 mb-1 block">Scan KTP Ahli Waris</label>
            <input @change="e => handleAhliKtpUpload(e, index)" accept="image/*" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" type="file" :disabled="isScanning" />
            <p class="text-xs text-gray-400 mt-1">Upload KTP untuk mengisi nama & NIK secara otomatis.</p>
            <p class="text-xs text-gray-500 mt-1">{{ ahli.ktpFile ? 'File terakhir: ' + ahli.ktpFile.name : 'Belum mengunggah KTP untuk OCR' }}</p>
          </div>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Alamat</label>
              <input v-model="ahli.alamat" class="w-full px-3 py-2 border rounded text-sm" placeholder="Alamat sesuai KTP" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Agama</label>
              <input v-model="ahli.agama" class="w-full px-3 py-2 border rounded text-sm" placeholder="Agama" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Jenis Kelamin</label>
              <input v-model="ahli.jenisKelamin" class="w-full px-3 py-2 border rounded text-sm" placeholder="Laki-laki / Perempuan" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Golongan Darah</label>
              <input v-model="ahli.golonganDarah" class="w-full px-3 py-2 border rounded text-sm" placeholder="A / B / O / AB" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Pekerjaan</label>
              <input v-model="ahli.pekerjaan" class="w-full px-3 py-2 border rounded text-sm" placeholder="Pekerjaan" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Kecamatan</label>
              <input v-model="ahli.kecamatan" class="w-full px-3 py-2 border rounded text-sm" placeholder="Kecamatan" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Kelurahan/Desa</label>
              <input v-model="ahli.kelurahanAtauDesa" class="w-full px-3 py-2 border rounded text-sm" placeholder="Kelurahan atau Desa" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Kewarganegaraan</label>
              <input v-model="ahli.kewarganegaraan" class="w-full px-3 py-2 border rounded text-sm" placeholder="WNI" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Status Perkawinan</label>
              <input v-model="ahli.statusPerkawinan" class="w-full px-3 py-2 border rounded text-sm" placeholder="Status" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">RT</label>
              <input v-model="ahli.rt" class="w-full px-3 py-2 border rounded text-sm" placeholder="RT" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">RW</label>
              <input v-model="ahli.rw" class="w-full px-3 py-2 border rounded text-sm" placeholder="RW" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Tanggal Lahir</label>
              <input v-model="ahli.tanggalLahir" class="w-full px-3 py-2 border rounded text-sm" placeholder="DD-MM-YYYY" />
            </div>
            <div>
              <label class="text-xs font-bold text-gray-500 mb-1 block">Tempat Lahir</label>
              <input v-model="ahli.tempatLahir" class="w-full px-3 py-2 border rounded text-sm" placeholder="Tempat Lahir" />
            </div>
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
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>