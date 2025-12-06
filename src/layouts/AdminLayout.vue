<script setup>
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth' // Import Store
import logoUrl from '@/assets/images/logo.png'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Fungsi Logout: Hapus sesi Pinia & Redirect ke Login
const handleLogout = () => {
  authStore.logout() // Panggil aksi logout di store
  router.push('/login')
}

// Menu Navigasi Admin (Sesuai SDD)
const menus = [
  { 
    name: 'Antrian Pengajuan', 
    path: '/admin/antrian', 
    icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z' 
  },
  { 
    name: 'Arsip Dokumen', 
    path: '/admin/arsip', 
    icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z' 
  },
]
</script>

<template>
  <div class="flex h-screen bg-gray-50 font-sans text-slate-800">
    
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
      <div class="p-6 flex items-center gap-3 border-b border-gray-100">
        <img :src="logoUrl" alt="Logo" class="h-10 w-auto" />
        <div class="leading-none">
            <span class="block text-xs font-bold text-gray-400 uppercase">Kelurahan</span>
            <span class="block text-sm font-bold text-gray-800">Lenteng Agung</span>
        </div>
      </div>

      <nav class="flex-1 px-4 py-6 space-y-1">
        <p class="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu Petugas</p>
        <RouterLink 
          v-for="item in menus" 
          :key="item.path" 
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
          :class="route.path === item.path 
            ? 'bg-blue-50 text-blue-700' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          {{ item.name }}
        </RouterLink>
      </nav>

      <div class="p-4 border-t border-gray-100 bg-gray-50">
        <div class="flex items-center gap-3 mb-4 px-2">
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
                P
            </div>
            <div>
                <p class="text-sm font-bold text-gray-900">Petugas</p>
                <p class="text-xs text-blue-600 font-medium">Administrator</p>
            </div>
        </div>
        
        <button 
            @click="handleLogout"
            class="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-600 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors shadow-sm"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Logout
        </button>
      </div>
    </aside>

    <main class="flex-1 ml-64 p-8 overflow-y-auto">
      <RouterView />
    </main>
  </div>
</template>