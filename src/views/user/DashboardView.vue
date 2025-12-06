<script setup>
import { ref, computed } from 'vue'
import heroBg from '@/assets/images/hero-bg.png' // Menggunakan gambar blur yang sama

// State untuk Tab Aktif
const activeTab = ref('Diajukan')

// Data Dummy Pengajuan (Mock Data)
const applications = [
  { id: 'REG-001', date: '05 Des 2025', pewaris: 'Alm. Budi Santoso', status: 'Diajukan' },
  { id: 'REG-002', date: '01 Des 2025', pewaris: 'Alm. Siti Aminah', status: 'Selesai' },
  { id: 'REG-003', date: '28 Nov 2025', pewaris: 'Alm. Joko Widodo', status: 'Draft' },
]

// Filter Data berdasarkan Tab
const filteredApps = computed(() => {
  if (activeTab.value === 'Semua') return applications
  return applications.filter(app => app.status.includes(activeTab.value))
})

const tabs = ['Diajukan', 'Sedang Ditinjau', 'Perbaikan', 'Draft', 'Selesai']
</script>

<template>
  <div class="space-y-6">
    
    <div class="relative w-full h-48 rounded-2xl overflow-hidden shadow-sm group">
        <div 
            class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            :style="{ backgroundImage: `url(${heroBg})` }"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-900/20"></div>
        
        <div class="relative z-10 h-full flex flex-col justify-center px-8 text-white">
            <h1 class="text-3xl font-bold mb-2">Halo, Agung!</h1>
            <p class="text-lg opacity-90">Pantau status surat waris Anda dengan mudah di sini.</p>
        </div>
    </div>

    <div class="flex flex-wrap gap-3">
        <button 
            v-for="tab in tabs" 
            :key="tab"
            @click="activeTab = tab"
            class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm border"
            :class="activeTab === tab 
                ? 'bg-blue-700 text-white border-blue-700 shadow-md' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
        >
            {{ tab === 'Selesai' ? 'Selesai Ditandatangani' : (tab === 'Perbaikan' ? 'Perbaikan Kesalahan' : `Dokumen ${tab}`) }}
        </button>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
        
        <div class="grid grid-cols-4 gap-4 p-5 border-b border-gray-100 text-sm font-bold text-gray-500 bg-gray-50/50 rounded-t-xl">
            <div>NO. REGISTRASI</div>
            <div>TANGGAL</div>
            <div>NAMA PEWARIS</div>
            <div class="text-center">STATUS</div>
        </div>

        <div v-if="filteredApps.length > 0">
            <div 
                v-for="app in filteredApps" 
                :key="app.id"
                class="grid grid-cols-4 gap-4 p-5 border-b border-gray-50 items-center text-sm hover:bg-gray-50 transition-colors cursor-pointer"
            >
                <div class="font-medium text-slate-800">{{ app.id }}</div>
                <div class="text-slate-500">{{ app.date }}</div>
                <div class="text-slate-800">{{ app.pewaris }}</div>
                <div class="text-center">
                    <span 
                        class="px-3 py-1 rounded-full text-xs font-semibold inline-block"
                        :class="{
                            'bg-yellow-100 text-yellow-700': app.status === 'Diajukan',
                            'bg-green-100 text-green-700': app.status === 'Selesai',
                            'bg-gray-100 text-gray-600': app.status === 'Draft',
                        }"
                    >
                        {{ app.status }}
                    </span>
                </div>
            </div>
        </div>

        <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mb-4 opacity-50">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p>Belum ada dokumen di tab ini.</p>
        </div>

    </div>
  </div>
</template>