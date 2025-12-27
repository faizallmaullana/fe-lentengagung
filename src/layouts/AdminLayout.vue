<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const sidebarOpen = ref(false)
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

// Tutup sidebar otomatis saat pindah halaman (UX Mobile)
router.afterEach(() => {
  sidebarOpen.value = false
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    
    <div 
      v-if="sidebarOpen" 
      @click="sidebarOpen = false"
      class="fixed inset-0 z-20 bg-black/50 transition-opacity md:hidden"
    ></div>

    <aside 
      class="fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white border-r border-slate-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center justify-center h-16 border-b border-slate-800 bg-slate-900">
        <div class="flex items-center gap-3">
           <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
               <path fill-rule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clip-rule="evenodd" />
               <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
             </svg>
           </div>
           <div>
             <h1 class="text-sm font-bold leading-tight">ADMIN PANEL</h1>
             <p class="text-[10px] text-slate-400 tracking-wider">SIWARIS SYSTEM</p>
           </div>
        </div>
      </div>

      <nav class="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)] flex flex-col justify-between">
        <div class="space-y-1">
            <router-link 
              to="/admin/antrian" 
              class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
              :class="route.path.includes('antrian') || route.path.includes('verifikasi') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
              Antrian Verifikasi
            </router-link>

            <router-link 
              to="/admin/arsip" 
              class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
              :class="route.path.includes('arsip') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
              Arsip Dokumen
            </router-link>
        </div>

        <div class="pt-4 mt-4 border-t border-slate-800">
            <div class="flex items-center gap-3 px-2 mb-3">
                <div class="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-slate-300">
                    ADM
                </div>
                <div class="overflow-hidden">
                    <p class="text-sm font-bold text-slate-200 truncate">Petugas Kelurahan</p>
                    <p class="text-xs text-slate-500">Admin Akses</p>
                </div>
            </div>
            <button 
                @click="handleLogout" 
                class="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                Keluar
            </button>
        </div>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <header class="bg-slate-900 text-white border-b border-slate-800 p-4 flex items-center gap-3 md:hidden sticky top-0 z-10 shadow-md">
            <button @click="toggleSidebar" class="p-2 -ml-2 text-slate-300 rounded-lg hover:bg-slate-800">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
            <span class="font-bold tracking-wide">ADMINISTRATOR</span>
        </header>

        <main class="flex-1 overflow-y-auto p-4 md:p-8">
            <router-view />
        </main>
    </div>

  </div>
</template>