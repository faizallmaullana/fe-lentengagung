<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth' // Pastikan path store benar

// --- STATE ---
const sidebarOpen = ref(false) // Untuk kontrol menu di mobile
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// --- ACTIONS ---
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

// Menutup sidebar saat pindah halaman (UX Mobile)
router.afterEach(() => {
  sidebarOpen.value = false
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex font-sans">
    
    <div 
      v-if="sidebarOpen" 
      @click="sidebarOpen = false"
      class="fixed inset-0 z-20 bg-black/50 transition-opacity md:hidden"
    ></div>

    <aside 
      class="fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center justify-center h-16 border-b border-gray-100">
        <div class="flex items-center gap-2">
           <img src="@/assets/images/logo.png" alt="Logo" class="w-8 h-8" /> <div>
             <h1 class="text-sm font-bold text-gray-800 leading-tight">KELURAHAN</h1>
             <p class="text-xs font-semibold text-blue-600">Lenteng Agung</p>
           </div>
        </div>
      </div>

      <nav class="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)] flex flex-col justify-between">
        <div class="space-y-1">
            <router-link 
              to="/dashboard" 
              class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
              :class="route.path === '/dashboard' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
              Dashboard
            </router-link>

            <router-link 
              to="/dashboard/pengajuan" 
              class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
              :class="route.path.includes('pengajuan') && !route.path.includes('riwayat') ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              Formulir Pengajuan
            </router-link>

            <router-link 
              to="/dashboard/riwayat" 
              class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
              :class="route.path.includes('riwayat') ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Riwayat Pengajuan
            </router-link>
        </div>

        <div class="pt-4 mt-4 border-t border-gray-100">
            <div class="flex items-center gap-3 px-2 mb-3">
                <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                    {{ authStore.user?.name?.charAt(0) || 'U' }}
                </div>
                <div class="overflow-hidden">
                    <p class="text-sm font-bold text-gray-800 truncate">{{ authStore.user?.name || 'Warga' }}</p>
                    <p class="text-xs text-gray-500">Warga</p>
                </div>
            </div>
            <button 
                @click="handleLogout" 
                class="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                Logout
            </button>
        </div>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <header class="bg-white border-b border-gray-200 p-4 flex items-center gap-3 md:hidden sticky top-0 z-10">
            <button @click="toggleSidebar" class="p-2 -ml-2 text-gray-600 rounded-lg hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
            <span class="font-bold text-gray-800">Dashboard Warga</span>
        </header>

        <main class="flex-1 overflow-y-auto p-4 md:p-8">
            <router-view />
        </main>
    </div>

  </div>
</template>