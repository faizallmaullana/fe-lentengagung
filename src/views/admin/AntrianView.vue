<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router' // [1] WAJIB IMPORT INI
import heroBg from '@/assets/images/hero-bg.png'

const router = useRouter() // [2] WAJIB DEFINISIKAN INI

// Data Statistik Dummy
const stats = [
  { label: 'Permohonan Baru', count: 5, color: 'text-yellow-600', bg: 'bg-yellow-50', bar: 'bg-yellow-500' },
  { label: 'Permohonan Berjalan', count: 12, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
  { label: 'Dalam Perbaikan', count: 3, color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' },
]

// Data Tabel Dummy (Mock Data Antrian)
const applications = ref([
  { id: 'REG-005', pewaris: 'Alm. Budi Santoso', pemohon: 'Agung Santoso', tgl: '06 Des 2025', status: 'Diajukan' },
  { id: 'REG-004', pewaris: 'Alm. Siti Aminah', pemohon: 'Rina Wati', tgl: '05 Des 2025', status: 'Diajukan' },
  { id: 'REG-003', pewaris: 'Alm. Suparman', pemohon: 'Joko', tgl: '04 Des 2025', status: 'Revisi' },
  { id: 'REG-002', pewaris: 'Alm. Hartono', pemohon: 'Bambang', tgl: '02 Des 2025', status: 'Diproses' },
])

// [3] FUNGSI NAVIGASI YANG BENAR
const handleVerifikasi = (id) => {
  // Arahkan ke halaman detail verifikasi
  router.push(`/admin/verifikasi/${id}`)
}
</script>

<template>
  <div class="space-y-8">
    
    <h2 class="text-2xl font-bold text-gray-800">Dashboard Petugas</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div 
        v-for="(stat, index) in stats" 
        :key="index"
        class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden"
      >
        <div>
          <h3 class="text-4xl font-bold text-gray-800 mb-1">{{ stat.count }}</h3>
          <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
        </div>
        <div class="w-full bg-gray-100 h-1.5 rounded-full mt-4">
            <div class="h-1.5 rounded-full" :class="stat.bar" style="width: 70%"></div>
        </div>
        <div class="absolute right-4 top-4 w-10 h-10 rounded-full flex items-center justify-center opacity-20" :class="stat.bg">
            <div class="w-4 h-4 rounded-full" :class="stat.bar"></div>
        </div>
      </div>
    </div>

    <div class="relative w-full h-48 rounded-2xl overflow-hidden shadow-sm group">
        <div 
            class="absolute inset-0 bg-cover bg-center"
            :style="{ backgroundImage: `url(${heroBg})` }"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-900/20"></div>
        <div class="relative z-10 h-full flex flex-col justify-center px-8 text-white">
            <h1 class="text-3xl font-bold mb-2">Antrian Verifikasi</h1>
            <p class="text-lg opacity-90">Segera proses permohonan yang masuk untuk pelayanan prima.</p>
        </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
            <h3 class="text-lg font-bold text-gray-800">Daftar Permohonan Terbaru</h3>
            <p class="text-sm text-gray-500">Total 12.000 pemohon (Mock)</p>
        </div>
        <div class="relative">
            <input 
                type="text" 
                placeholder="Cari nama pemohon..." 
                class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 w-64 transition-all"
            />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-400 absolute left-3 top-3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
        </div>
      </div>

      <table class="w-full text-left text-sm text-gray-600">
        <thead class="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-xs border-b border-gray-100">
          <tr>
            <th class="px-6 py-4">Nama Pewaris</th>
            <th class="px-6 py-4">Nama Pemohon</th>
            <th class="px-6 py-4">Tanggal Masuk</th>
            <th class="px-6 py-4 text-center">Status</th>
            <th class="px-6 py-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="app in applications" :key="app.id" class="hover:bg-blue-50/30 transition-colors">
            <td class="px-6 py-4 font-medium text-gray-900">{{ app.pewaris }}</td>
            <td class="px-6 py-4">{{ app.pemohon }}</td>
            <td class="px-6 py-4">{{ app.tgl }}</td>
            <td class="px-6 py-4 text-center">
              <span 
                class="px-3 py-1 rounded-full text-xs font-semibold inline-block"
                :class="{
                    'bg-yellow-100 text-yellow-700': app.status === 'Diajukan',
                    'bg-blue-100 text-blue-700': app.status === 'Diproses',
                    'bg-red-100 text-red-700': app.status === 'Revisi'
                }"
              >
                {{ app.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button 
                @click="handleVerifikasi(app.id)"
                class="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded transition-all"
              >
                Verifikasi
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-500">
        Menampilkan 4 dari 12.000 data
      </div>
    </div>

  </div>
</template>