<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// Client-side OCR removed: we send file to server OCR endpoint instead
import Swal from 'sweetalert2'
// Import axios instance
import api from '@/axios'

const router = useRouter()

const STORAGE_KEY = 'pengajuan-form-draft-v1'
const isBrowser = typeof window !== 'undefined'

// --- STATE ---
const currentStep = ref(1)
const steps = ['Data Pewaris', 'Data Ahli Waris', 'Data Saksi', 'Upload Dokumen']
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

const basePersonFields = () => ({
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
})

const assignBasePersonFields = (target) => {
  const base = basePersonFields()
  Object.keys(base).forEach((key) => {
    target[key] = base[key]
  })
}

const spouseTemplate = () => ({ ...basePersonFields(), hubungan: 'Pasangan', ktpFile: null })
const newEmptyAhli = () => ({ ...basePersonFields(), hubungan: 'Anak Kandung', ktpFile: null, aktaKelahiranFile: null, aktaUploaded: false, aktaUploading: false, aktaUploadProgress: 0 })
const newEmptySaksi = () => ({ ...basePersonFields(), hubungan: 'Saksi', ktpFile: null })

const form = reactive({
  pewaris: basePersonFields(),
  ahliWarisList: [spouseTemplate(), newEmptyAhli()],
  saksiList: [newEmptySaksi(), newEmptySaksi()],
  dokumenPendukung: []
})

const spouseEntry = computed(() => form.ahliWarisList[0])
const childList = computed(() => form.ahliWarisList.slice(1))

const getFormSnapshot = () => ({
  pewaris: { ...form.pewaris },
  ahliWarisList: form.ahliWarisList.map((ahli) => {
    const { ktpFile, ...rest } = ahli
    return { ...rest, ktpFile: null }
  }),
  saksiList: form.saksiList.map((saksi) => {
    const { ktpFile, ...rest } = saksi
    return { ...rest, ktpFile: null }
  }),
  dokumenPendukung: form.dokumenPendukung.map((dok) => {
    const { file, ...rest } = dok
    return { ...rest, file: null }
  }),
  currentStep: currentStep.value
})

const persistFormDraft = () => {
  if (!isBrowser) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getFormSnapshot()))
  } catch (error) {
    console.warn('Gagal menyimpan draft pengajuan', error)
  }
}

const clearFormDraft = () => {
  if (!isBrowser) return
  localStorage.removeItem(STORAGE_KEY)
}

const loadFormDraft = () => {
  if (!isBrowser) return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const draft = JSON.parse(raw)
    if (draft.pewaris) Object.assign(form.pewaris, draft.pewaris)
    if (Array.isArray(draft.ahliWarisList) && draft.ahliWarisList.length > 0) {
      const normalized = draft.ahliWarisList.map((entry, index) => {
        const template = index === 0 ? spouseTemplate() : newEmptyAhli()
        return { ...template, ...entry, ktpFile: null, hubungan: template.hubungan }
      })
      if (normalized.length < 2) normalized.push(newEmptyAhli())
      form.ahliWarisList.splice(0, form.ahliWarisList.length, ...normalized)
    }
    if (Array.isArray(draft.saksiList) && draft.saksiList.length > 0) {
      const mapped = draft.saksiList.map((item) => {
        const template = newEmptySaksi()
        return { ...template, ...item, ktpFile: null }
      })
      if (mapped.length < 2) mapped.push(newEmptySaksi())
      form.saksiList.splice(0, form.saksiList.length, ...mapped)
    }
    if (typeof draft.currentStep === 'number' && draft.currentStep >= 1 && draft.currentStep <= steps.length) {
      currentStep.value = draft.currentStep
    }
  } catch (error) {
    console.warn('Gagal memuat draft pengajuan', error)
    localStorage.removeItem(STORAGE_KEY)
  }
}

watch(form, () => persistFormDraft(), { deep: true })
watch(currentStep, () => persistFormDraft())

const resetFormSection = () => {
  assignBasePersonFields(form.pewaris)
  form.ahliWarisList.splice(0, form.ahliWarisList.length, spouseTemplate(), newEmptyAhli())
  form.saksiList.splice(0, form.saksiList.length, newEmptySaksi(), newEmptySaksi())
  form.dokumenPendukung = []
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
    if (!data) {
      Swal.fire({ icon: 'info', title: 'OCR Tidak Tersedia', text: 'File tersimpan, silakan isi manual.' })
      return
    }

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

    if (parsed) {
      applyOcrParsed(parsed)
      Swal.fire({ icon: 'success', title: 'OCR Sukses', text: 'Data KTP terisi otomatis. Mohon periksa kembali.' })
    } else {
      Swal.fire({ icon: 'info', title: 'OCR Tidak Tersedia', text: 'File tersimpan, silakan isi data manual.' })
    }
  } catch (error) {
    console.error('OCR upload failed', error)
    Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: 'Terjadi kesalahan saat mengunggah atau memproses OCR.' })
  } finally {
    try { Swal.close() } catch (e) {}
    isScanning.value = false
  }
}

// --- HELPER LAIN (Sama seperti sebelumnya) ---

const handlePasanganKtpUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

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

    const spouse = spouseEntry.value
    if (!spouse) return
    spouse.ktpFile = file

    if (parsed) {
      const { data } = unwrapOcrPayload(parsed)
      if (data) {
        applyOcrToEntity(spouse, data)
        Swal.fire({ icon: 'success', title: 'OCR Sukses', text: 'Data pasangan terisi otomatis.' })
      } else {
        Swal.fire({ icon: 'info', title: 'OCR Tidak Tersedia', text: 'File tersimpan, silakan isi manual.' })
      }
    } else {
      Swal.fire({ icon: 'info', title: 'OCR Tidak Tersedia', text: 'File tersimpan, silakan isi manual.' })
    }
  } catch (error) {
    console.error('OCR upload failed for pasangan', error)
    Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: 'Terjadi kesalahan saat memproses OCR.' })
    const spouse = spouseEntry.value
    if (spouse) spouse.ktpFile = file
  } finally {
    try { Swal.close() } catch (e) {}
    isScanning.value = false
    event.target.value = ''
  }
}

const handleChildKtpUpload = async (event, childIndex) => {
  const file = event.target.files[0]
  if (!file) return
  const absoluteIndex = childIndex + 1
  const ahli = form.ahliWarisList[absoluteIndex]
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
      applyOcrToAhli(parsed, absoluteIndex)
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

const addChild = () => { form.ahliWarisList.push(newEmptyAhli()) }
const removeChild = (childIndex) => {
  if (form.ahliWarisList.length <= 2) {
    Swal.fire('Gagal', 'Minimal 1 Anak sebagai ahli waris.', 'warning')
    return
  }
  form.ahliWarisList.splice(childIndex + 1, 1)
}
const addSaksi = () => { form.saksiList.push(newEmptySaksi()) }
const removeSaksi = (index) => {
  if (form.saksiList.length > 1) form.saksiList.splice(index, 1)
  else Swal.fire('Gagal', 'Minimal 1 Saksi.', 'warning')
}

const addCustomDocument = () => {
  form.dokumenPendukung.push({ 
    nama: '', 
    file: null, 
    fileName: null,
    uploaded: false,
    uploading: false,
    uploadProgress: 0,
    required: false 
  })
}

const handleChildAktaUpload = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return
  
  const child = form.ahliWarisList[index + 1] // +1 karena index 0 adalah spouse
  if (!child) return

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire('File Terlalu Besar', 'Maksimal 5MB', 'warning')
    event.target.value = ''
    return
  }

  child.aktaUploading = true
  child.aktaUploadProgress = 0

  try {
    Swal.fire({
      title: 'Mengunggah akta kelahiran...',
      text: 'Mohon tunggu, file sedang diupload',
      didOpen: () => Swal.showLoading(),
      allowEscapeKey: false,
      allowOutsideClick: false
    })

    const fd = new FormData()
    fd.append('file', file)

    const res = await api.post('/upload/akta', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        child.aktaUploadProgress = percentCompleted
      }
    })

    child.aktaKelahiranFile = file
    child.aktaFileName = res.data.file_name
    child.aktaUploaded = true

    Swal.fire({
      icon: 'success',
      title: 'Upload Berhasil',
      text: 'Akta kelahiran berhasil diunggah',
      timer: 2000,
      showConfirmButton: false
    })
  } catch (error) {
    console.error('Akta upload failed', error)
    Swal.fire({
      icon: 'error', 
      title: 'Gagal Upload',
      text: 'Terjadi kesalahan saat mengunggah akta kelahiran'
    })
    child.aktaKelahiranFile = file
    child.aktaUploaded = false
  } finally {
    child.aktaUploading = false
    event.target.value = ''
    try { Swal.close() } catch (e) {}
  }
}

const handleCustomDocumentUpload = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.size > 5 * 1024 * 1024) {
    Swal.fire('File Terlalu Besar', 'Maksimal 5MB', 'warning')
    event.target.value = ''
    return
  }
  
  const dokumen = form.dokumenPendukung[index]
  if (!dokumen) return

  // Show uploading progress
  dokumen.uploading = true
  dokumen.uploadProgress = 0
  
  try {
    Swal.fire({
      title: 'Mengunggah dokumen...',
      text: 'Mohon tunggu, file sedang diupload',
      didOpen: () => Swal.showLoading(),
      allowEscapeKey: false,
      allowOutsideClick: false
    })
    
    const fd = new FormData()
    fd.append('file', file)
    
    // Upload to backend using documents endpoint
    const res = await api.post('/upload/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        dokumen.uploadProgress = percentCompleted
      }
    })
    
    // Store file info and backend filename
    dokumen.file = file
    dokumen.fileName = res.data.file_name // Backend returns this
    dokumen.uploaded = true
    
    Swal.fire({
      icon: 'success',
      title: 'Upload Berhasil',
      text: 'Dokumen berhasil diunggah',
      timer: 2000,
      showConfirmButton: false
    })
    
  } catch (error) {
    console.error('Document upload failed', error)
    Swal.fire({
      icon: 'error',
      title: 'Gagal Upload',
      text: 'Terjadi kesalahan saat mengunggah dokumen'
    })
    
    // Still store file locally for user reference
    dokumen.file = file
    dokumen.uploaded = false
  } finally {
    dokumen.uploading = false
    event.target.value = ''
  }
}

const handleSaksiKtpUpload = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return
  const saksi = form.saksiList[index]
  if (!saksi) return

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

    saksi.ktpFile = file

    if (parsed) {
      const { data } = unwrapOcrPayload(parsed)
      if (data) {
        applyOcrToEntity(saksi, data)
        Swal.fire({ icon: 'success', title: 'OCR Sukses', text: 'Data saksi terisi otomatis.' })
      } else {
        Swal.fire({ icon: 'info', title: 'OCR Tidak Tersedia', text: 'File tersimpan, silakan isi manual.' })
      }
    } else {
      Swal.fire({ icon: 'info', title: 'OCR Tidak Tersedia', text: 'File tersimpan, silakan isi manual.' })
    }
  } catch (error) {
    console.error('OCR upload failed for saksi', error)
    Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: 'Terjadi kesalahan saat memproses OCR.' })
    saksi.ktpFile = file
  } finally {
    try { Swal.close() } catch (e) {}
    isScanning.value = false
    event.target.value = ''
  }
}

// --- VALIDASI & NAVIGASI ---
const validateStep1 = () => {
  const { nik, nama, tanggalMeninggal, alamat } = form.pewaris
  if (!nik || !nama || !tanggalMeninggal || !alamat) { Swal.fire('Lengkapi Data', 'Semua data pewaris wajib diisi.', 'warning'); return false }
  if (String(nik).length !== 16) { Swal.fire('Format Salah', 'NIK harus 16 digit.', 'warning'); return false }
  return true
}
const validateStep2 = () => {
  const children = childList.value
  for (let i = 0; i < children.length; i++) {
    const ahli = children[i]
    if (!ahli.nama || !ahli.nik || !ahli.hubungan) { Swal.fire('Data Kurang', `Ahli Waris ke-${i + 1} belum lengkap.`, 'warning'); return false }
    if (String(ahli.nik).length !== 16) { Swal.fire('Format Salah', `NIK Ahli Waris ke-${i + 1} harus 16 digit.`, 'warning'); return false }
  }
  return true
}
const validateStep3 = () => {
  for (let i = 0; i < form.saksiList.length; i++) {
    const saksi = form.saksiList[i]
    if (!saksi.nama || !saksi.nik) { Swal.fire('Data Kurang', `Saksi ke-${i + 1} belum lengkap (nama dan NIK wajib).`, 'warning'); return false }
    if (String(saksi.nik).length !== 16) { Swal.fire('Format Salah', `NIK Saksi ke-${i + 1} harus 16 digit.`, 'warning'); return false }
  }
  return true
}
const validateStep4 = () => {
  return true // No required documents anymore
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
  
  if (!formId.value) {
    Swal.fire('Error', 'ID form tidak ditemukan. Silakan refresh halaman.', 'error')
    return
  }
  
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
    try {
      Swal.fire({ title: 'Mengirim permohonan...', didOpen: () => Swal.showLoading() })
      
      // Prepare form data for submission
      const formData = {
        pewaris: form.pewaris,
        ahliWarisList: form.ahliWarisList.map(ahli => {
          const { ktpFile, aktaKelahiranFile, ...rest } = ahli
          return {
            ...rest,
            aktaFileName: ahli.aktaFileName || null
          }
        }),
        saksiList: form.saksiList.map(saksi => {
          const { ktpFile, ...rest } = saksi
          return rest
        }),
        dokumenPendukung: form.dokumenPendukung.map(dok => ({
          nama: dok.nama,
          fileName: dok.fileName,
          uploaded: dok.uploaded
        }))
      }
      
      // Submit to PUT /api/request/:id_request
      const response = await api.put(`/form/${formId.value}`, formData)
      
      await Swal.fire({ 
        icon: 'success', 
        title: 'Berhasil!', 
        text: 'Permohonan berhasil dikirim dan sedang diproses.', 
        confirmButtonColor: '#16a34a' 
      })
      
      clearFormDraft()
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Submit form failed:', error)
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim',
        text: error.response?.data?.error || 'Terjadi kesalahan saat mengirim permohonan. Silakan coba lagi.',
        confirmButtonColor: '#d33'
      })
    }
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
  loadFormDraft()
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
        <div class="border-b pb-3 mb-6">
          <h2 class="text-xl font-bold text-gray-800 mb-1">Data Pewaris</h2>
          <p class="text-sm text-gray-600">Isi data lengkap pewaris yang telah meninggal dunia</p>
        </div>
        
        <!-- Scan KTP Pewaris -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Scan KTP Pewaris</label>
          <input type="file" accept="image/*" @change="handleScanKTP" :disabled="isScanning" class="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer border border-dashed border-blue-300 rounded-lg p-3" />
          <div class="flex justify-between items-center mt-3">
            <p class="text-xs text-blue-600">💡 Tips: Gunakan foto KTP yang terang dan tegak lurus untuk hasil OCR terbaik</p>
            <div v-if="isScanning" class="text-xs text-blue-600 animate-pulse font-medium flex items-center gap-2">
              <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              Memproses OCR... {{ scanProgress }}%
            </div>
          </div>
          <div class="mt-2 flex justify-start gap-4 text-xs">
            <button @click="loadSampleJson" type="button" class="text-blue-600 hover:text-blue-800 underline transition-colors">Isi dari JSON contoh</button>
            <button @click="resetFormSection" type="button" class="text-gray-500 hover:text-gray-700 underline transition-colors">Reset form</button>
          </div>
        </div>

        <!-- Data Utama -->
        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Data Utama</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">NIK Pewaris *</label>
              <input v-model="form.pewaris.nik" type="number" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Masukkan 16 digit NIK" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label>
              <input v-model="form.pewaris.nama" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nama sesuai KTP" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Meninggal *</label>
              <input v-model="form.pewaris.tanggalMeninggal" type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" />
              <p class="text-xs text-orange-600 mt-1">* Wajib diisi manual (tidak tersedia di KTP)</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Alamat Terakhir *</label>
              <input v-model="form.pewaris.alamat" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Alamat lengkap" />
            </div>
          </div>
        </div>
        <!-- Data Pribadi -->
        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Data Pribadi</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Agama</label>
              <input v-model="form.pewaris.agama" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Islam, Kristen, dll" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin</label>
              <select v-model="form.pewaris.jenisKelamin" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                <option value="">Pilih jenis kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Golongan Darah</label>
              <select v-model="form.pewaris.golonganDarah" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                <option value="">Pilih golongan darah</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Pekerjaan</label>
              <input v-model="form.pewaris.pekerjaan" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Profesi/pekerjaan" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status Perkawinan</label>
              <select v-model="form.pewaris.statusPerkawinan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                <option value="">Pilih status</option>
                <option value="Belum Kawin">Belum Kawin</option>
                <option value="Kawin">Kawin</option>
                <option value="Cerai Hidup">Cerai Hidup</option>
                <option value="Cerai Mati">Cerai Mati</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kewarganegaraan</label>
              <input v-model="form.pewaris.kewarganegaraan" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="WNI" />
            </div>
          </div>
        </div>
        
        <!-- Data Alamat -->
        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Data Kelahiran & Alamat</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tempat Lahir</label>
              <input v-model="form.pewaris.tempatLahir" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Kota kelahiran" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
              <input v-model="form.pewaris.tanggalLahir" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="DD-MM-YYYY" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kecamatan</label>
              <input v-model="form.pewaris.kecamatan" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nama kecamatan" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kelurahan/Desa</label>
              <input v-model="form.pewaris.kelurahanAtauDesa" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nama kelurahan/desa" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">RT</label>
              <input v-model="form.pewaris.rt" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">RW</label>
              <input v-model="form.pewaris.rw" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="000" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 2" class="space-y-6 animate-fade-in">
        <div class="border-b pb-3 mb-6">
          <h2 class="text-xl font-bold text-gray-800 mb-1">Data Ahli Waris</h2>
          <p class="text-sm text-gray-600">Isi data pasangan dan anak-anak sebagai ahli waris</p>
        </div>
        
        <!-- Data Pasangan -->
        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-1">Data Pasangan</h3>
              <p class="text-sm text-gray-600">Isi data pasangan terlebih dahulu sebelum menambahkan anak</p>
            </div>
            <span class="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">Opsional</span>
          </div>
          
          <!-- Scan KTP Pasangan -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Scan KTP Pasangan</label>
            <input @change="handlePasanganKtpUpload" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer border border-dashed border-blue-300 rounded-lg p-3" type="file" :disabled="isScanning" />
            <div class="flex justify-between items-center mt-3">
              <p class="text-xs text-blue-600">💡 Upload untuk mengisi data otomatis (nama, NIK, dll)</p>
              <div v-if="isScanning" class="text-xs text-blue-600 animate-pulse font-medium flex items-center gap-2">
                <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                Memproses OCR...
              </div>
            </div>
            <p class="text-xs text-gray-600 mt-2">{{ spouseEntry.ktpFile ? 'File: ' + spouseEntry.ktpFile.name : 'Belum ada file yang dipilih' }}</p>
          </div>
          
          <!-- Data Utama Pasangan -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">NIK Pasangan</label>
              <input v-model="spouseEntry.nik" type="number" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Masukkan 16 digit NIK" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
              <input v-model="spouseEntry.nama" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nama sesuai KTP" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Meninggal</label>
              <input v-model="spouseEntry.tanggalMeninggal" type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" />
              <p class="text-xs text-gray-500 mt-1">Kosongkan jika masih hidup</p>
            </div>
          </div>
          
          <!-- Data Pribadi Pasangan -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
              <input v-model="spouseEntry.alamat" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Alamat lengkap" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Agama</label>
              <input v-model="spouseEntry.agama" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Agama" />
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin</label>
              <select v-model="spouseEntry.jenisKelamin" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                <option value="">Pilih jenis kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Golongan Darah</label>
              <select v-model="spouseEntry.golonganDarah" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                <option value="">Pilih golongan darah</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Pekerjaan</label>
              <input v-model="spouseEntry.pekerjaan" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Profesi/pekerjaan" />
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kecamatan</label>
              <input v-model="spouseEntry.kecamatan" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nama kecamatan" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kelurahan/Desa</label>
              <input v-model="spouseEntry.kelurahanAtauDesa" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Kelurahan/desa" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kewarganegaraan</label>
              <input v-model="spouseEntry.kewarganegaraan" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="WNI" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status Perkawinan</label>
              <select v-model="spouseEntry.statusPerkawinan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                <option value="">Pilih status</option>
                <option value="Belum Kawin">Belum Kawin</option>
                <option value="Kawin">Kawin</option>
                <option value="Cerai Hidup">Cerai Hidup</option>
                <option value="Cerai Mati">Cerai Mati</option>
              </select>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">RT</label>
              <input v-model="spouseEntry.rt" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">RW</label>
              <input v-model="spouseEntry.rw" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
              <input v-model="spouseEntry.tanggalLahir" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="DD-MM-YYYY" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tempat Lahir</label>
              <input v-model="spouseEntry.tempatLahir" type="text" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Kota kelahiran" />
            </div>
          </div>
        </div>
        
        <!-- Data Anak-anak -->
        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-1">Data Anak-anak</h3>
              <p class="text-sm text-gray-600">Tambahkan data anak sebagai ahli waris</p>
            </div>
            <button @click="addChild" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Tambah Anak
            </button>
          </div>
          <div v-for="(ahli, index) in childList" :key="index" class="bg-gray-50 border border-gray-200 rounded-xl p-6 relative">
            <button v-if="childList.length > 1" @click="removeChild(index)" class="absolute top-4 right-4 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            <h4 class="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Anak ke-{{ index + 1 }}</h4>
            
            <!-- Scan KTP Anak -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Scan KTP Anak ke-{{ index + 1 }}</label>
              <input @change="e => handleChildKtpUpload(e, index)" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer border border-dashed border-blue-300 rounded-lg p-3" type="file" :disabled="isScanning" />
              <div class="flex justify-between items-center mt-3">
                <p class="text-xs text-blue-600">💡 Upload KTP untuk mengisi data otomatis</p>
                <div v-if="isScanning" class="text-xs text-blue-600 animate-pulse font-medium flex items-center gap-2">
                  <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  Memproses OCR...
                </div>
              </div>
              <p class="text-xs text-gray-600 mt-2">{{ ahli.ktpFile ? 'File: ' + ahli.ktpFile.name : 'Belum ada file yang dipilih' }}</p>
            </div>
            
            <!-- Upload Akta Kelahiran (Wajib) -->
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Akta Kelahiran Anak ke-{{ index + 1 }} *</label>
              <p class="text-xs text-red-600 mb-2">⚠️ Wajib: Upload akta kelahiran untuk setiap anak</p>
              <input @change="e => handleChildAktaUpload(e, index)" accept="image/*,.pdf" class="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200 cursor-pointer border border-dashed border-red-300 rounded-lg p-3" type="file" :disabled="ahli.aktaUploading" />
              
              <!-- Upload Status for Akta -->
              <div class="mt-2">
                <div v-if="ahli.aktaUploading" class="flex items-center gap-2 text-xs text-blue-600">
                  <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Mengunggah... {{ ahli.aktaUploadProgress }}%</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-1 ml-2">
                    <div class="bg-blue-600 h-1 rounded-full transition-all duration-300" :style="`width: ${ahli.aktaUploadProgress}%`"></div>
                  </div>
                </div>
                
                <div v-else-if="ahli.aktaUploaded" class="flex items-center gap-2 text-xs text-green-600">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>✅ Akta kelahiran terupload: {{ ahli.aktaKelahiranFile?.name }}</span>
                </div>
                
                <div v-else-if="ahli.aktaKelahiranFile && !ahli.aktaUploaded" class="flex items-center gap-2 text-xs text-red-600">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>❌ Upload gagal: {{ ahli.aktaKelahiranFile?.name }}</span>
                </div>
                
                <p v-else class="text-xs text-gray-500">Belum ada akta kelahiran yang dipilih</p>
              </div>
            </div>
            
            <!-- Data Utama Anak -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label>
                <input v-model="ahli.nama" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nama sesuai KTP" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">NIK *</label>
                <input v-model="ahli.nik" type="number" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="16 digit NIK" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Hubungan *</label>
                <select v-model="ahli.hubungan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                  <option disabled value="">Pilih hubungan</option>
                  <option>Anak Kandung</option>
                  <option>Anak Tiri</option>
                  <option>Anak Angkat</option>
                  <option>Cucu</option>
                </select>
              </div>
            </div>
            
            <!-- Data Alamat Anak -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                <input v-model="ahli.alamat" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Alamat lengkap" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Meninggal</label>
                <input v-model="ahli.tanggalMeninggal" type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" />
                <p class="text-xs text-gray-500 mt-1">Kosongkan jika masih hidup</p>
              </div>
            </div>
            
            <!-- Data Pribadi Anak -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Agama</label>
                <input v-model="ahli.agama" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Agama" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin</label>
                <select v-model="ahli.jenisKelamin" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                  <option value="">Pilih jenis kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Golongan Darah</label>
                <select v-model="ahli.golonganDarah" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                  <option value="">Pilih golongan darah</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
            </div>
            
            <!-- Data Detail Anak -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Pekerjaan</label>
                <input v-model="ahli.pekerjaan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Profesi/pekerjaan" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Kecamatan</label>
                <input v-model="ahli.kecamatan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nama kecamatan" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Kelurahan/Desa</label>
                <input v-model="ahli.kelurahanAtauDesa" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Kelurahan/desa" />
              </div>
            </div>
            
            <!-- Data Lokasi dan Kelahiran -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Kewarganegaraan</label>
                  <input v-model="ahli.kewarganegaraan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="WNI" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Status Perkawinan</label>
                  <select v-model="ahli.statusPerkawinan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                    <option value="">Pilih status</option>
                    <option value="Belum Kawin">Belum Kawin</option>
                    <option value="Kawin">Kawin</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                  </select>
                </div>
                <div></div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">RT</label>
                  <input v-model="ahli.rt" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="000" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">RW</label>
                  <input v-model="ahli.rw" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="000" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
                  <input v-model="ahli.tanggalLahir" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="DD-MM-YYYY" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tempat Lahir</label>
                  <input v-model="ahli.tempatLahir" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Kota kelahiran" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 3" class="space-y-6 animate-fade-in">
        <div class="border-b pb-3 mb-6">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-xl font-bold text-gray-800 mb-1">Data Saksi</h2>
              <p class="text-sm text-gray-600">Tambahkan data saksi-saksi dalam pengajuan waris</p>
            </div>
            <button @click="addSaksi" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Tambah Saksi
            </button>
          </div>
        </div>
        
        <div v-for="(saksi, index) in form.saksiList" :key="index" class="bg-white border border-gray-200 rounded-xl p-6 relative">
          <button v-if="form.saksiList.length > 1" @click="removeSaksi(index)" class="absolute top-4 right-4 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          
          <h4 class="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Saksi ke-{{ index + 1 }}</h4>
          
          <!-- Scan KTP Saksi -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Scan KTP Saksi ke-{{ index + 1 }}</label>
            <input @change="e => handleSaksiKtpUpload(e, index)" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer border border-dashed border-blue-300 rounded-lg p-3" type="file" :disabled="isScanning" />
            <div class="flex justify-between items-center mt-3">
              <p class="text-xs text-blue-600">💡 Upload KTP untuk mengisi data otomatis</p>
              <div v-if="isScanning" class="text-xs text-blue-600 animate-pulse font-medium flex items-center gap-2">
                <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                Memproses OCR...
              </div>
            </div>
            <p class="text-xs text-gray-600 mt-2">{{ saksi.ktpFile ? 'File: ' + saksi.ktpFile.name : 'Belum ada file yang dipilih' }}</p>
          </div>
          
          <!-- Data Utama Saksi -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label>
              <input v-model="saksi.nama" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nama sesuai KTP" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">NIK *</label>
              <input v-model="saksi.nik" type="number" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="16 digit NIK" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Hubungan dengan Pewaris</label>
              <select v-model="saksi.hubungan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                <option disabled value="">Pilih hubungan</option>
                <option>Tetangga</option>
                <option>Teman</option>
                <option>Kerabat</option>
                <option>Rekan Kerja</option>
                <option>Tokoh Masyarakat</option>
                <option>Lainnya</option>
              </select>
            </div>
          </div>
          
          <!-- Data Alamat Saksi -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
              <input v-model="saksi.alamat" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Alamat lengkap" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Pekerjaan</label>
              <input v-model="saksi.pekerjaan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Profesi/pekerjaan" />
            </div>
          </div>
          
          <!-- Data Detail Saksi -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Agama</label>
              <input v-model="saksi.agama" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Agama" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin</label>
              <select v-model="saksi.jenisKelamin" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white">
                <option value="">Pilih jenis kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tempat Lahir</label>
              <input v-model="saksi.tempatLahir" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Kota kelahiran" />
            </div>
          </div>
          
          <!-- Data Lokasi Saksi -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kecamatan</label>
              <input v-model="saksi.kecamatan" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Nama kecamatan" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kelurahan/Desa</label>
              <input v-model="saksi.kelurahanAtauDesa" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="Kelurahan/desa" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">RT</label>
              <input v-model="saksi.rt" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">RW</label>
              <input v-model="saksi.rw" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" placeholder="000" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 4" class="space-y-6 animate-fade-in">
        <div class="border-b pb-3 mb-6">
          <h2 class="text-xl font-bold text-gray-800 mb-1">Dokumen Pendukung</h2>
          <p class="text-sm text-gray-600">Upload dokumen-dokumen yang diperlukan untuk pengajuan waris</p>
        </div>
        
        <!-- Dokumen -->
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-semibold text-gray-800">Dokumen Pendukung</h3>
              <p class="text-xs text-gray-600">Upload dokumen yang diperlukan untuk pengajuan waris</p>
            </div>
            <button @click="addCustomDocument" type="button" class="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Tambah Dokumen
            </button>
          </div>
          
          <div v-if="form.dokumenPendukung.length === 0" class="text-center py-8 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p class="text-sm">Belum ada dokumen</p>
            <p class="text-xs mt-1">Klik "Tambah Dokumen" untuk menambah dokumen pendukung</p>
          </div>
          
          <div v-else class="space-y-4">
            <div v-for="(dokumen, index) in form.dokumenPendukung" :key="index" class="bg-white border border-gray-200 rounded-lg p-4">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div class="flex-1">
                  <input v-model="dokumen.nama" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm" placeholder="Nama dokumen (contoh: Surat Nikah, Akta Tanah, dll)" />
                </div>
                <button @click="removeCustomDocument(index)" type="button" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
              <input @change="e => handleCustomDocumentUpload(e, index)" type="file" accept="image/*,.pdf" :disabled="dokumen.uploading" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer border border-dashed border-gray-300 rounded-lg p-3"/>
              
              <!-- Upload Status -->
              <div class="mt-2 space-y-1">
                <div v-if="dokumen.uploading" class="flex items-center gap-2 text-xs text-blue-600">
                  <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Mengunggah... {{ dokumen.uploadProgress }}%</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-1">
                    <div class="bg-blue-600 h-1 rounded-full transition-all duration-300" :style="`width: ${dokumen.uploadProgress}%`"></div>
                  </div>
                </div>
                
                <div v-else-if="dokumen.uploaded" class="flex items-center gap-2 text-xs text-green-600">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>Upload berhasil: {{ dokumen.file?.name }}</span>
                </div>
                
                <div v-else-if="dokumen.file && !dokumen.uploaded" class="flex items-center gap-2 text-xs text-red-600">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Upload gagal: {{ dokumen.file?.name }}</span>
                </div>
                
                <p v-else class="text-xs text-gray-500">Belum ada file yang dipilih</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
        <button v-if="currentStep > 1" @click="prevStep" class="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Kembali
        </button>
        <div v-else></div> 
        <button v-if="currentStep < 4" @click="nextStep" class="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg transition-colors font-medium">
          Lanjut
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
        <button v-else @click="submitForm" class="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg transition-colors font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
          Kirim Permohonan
        </button>
      </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>