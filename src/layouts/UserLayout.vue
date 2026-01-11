<script setup>
import { RouterView, useRoute, useRouter } from 'vue-router'
// [BARU] 1. Import Auth Store
import { useAuthStore } from '@/stores/auth'
import logoUrl from '@/assets/images/logo.png'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore() // [BARU] 2. Gunakan Store

// [BARU] 3. Update Fungsi Logout
const handleLogout = () => {
  // Panggil aksi logout dari store (hapus token & user dari localStorage)
  authStore.logout()
  // Arahkan kembali ke halaman login
  router.push('/login')
}

const menus = [
  { name: 'Dashboard', path: '/dashboard', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
  { name: 'Formulir Pengajuan', path: '/dashboard/pengajuan', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
  { name: 'Riwayat Pengajuan', path: '/dashboard/riwayat' , icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
]

// Compute visible menus: hide Dashboard unless user is admin/petugas
import { computed } from 'vue'
const visibleMenus = computed(() => {
  return menus.filter(item => {
    if (item.name === 'Dashboard') {
      // `isAdmin` from store indicates petugas; check .value in JS
      return !!authStore.isAdmin?.value
    }
    return true
  })
})
// '/maintenance'
</script>

<template>
  <div class="flex h-screen bg-gray-50 font-sans">
    
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
      <div class="p-6 flex items-center gap-3 border-b border-gray-100">
        <img :src="logoUrl" alt="Logo" class="h-10 w-auto" />
        <div class="leading-none">
            <span class="block text-xs font-bold text-gray-400 uppercase">Kelurahan</span>
            <span class="block text-sm font-bold text-gray-800">Lenteng Agung</span>
        </div>
      </div>

      <nav class="flex-1 px-4 py-6 space-y-1">
        <RouterLink 
          v-for="item in visibleMenus" 
          :key="item.path" 
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
          :class="route.path === item.path 
            ? 'bg-green-50 text-green-700' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          {{ item.name }}
        </RouterLink>
      </nav>

      <div class="p-4 border-t border-gray-100">
        <div class="flex items-center gap-3 mb-4 px-2">
            <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                {{ authStore.user?.name?.charAt(0) || 'A' }}
            </div>
            <div class="overflow-hidden">
                <p class="text-sm font-bold text-gray-900 truncate">{{ authStore.user?.name || 'Warga' }}</p>
                <p class="text-xs text-gray-500">Warga</p>
            </div>
        </div>
        <button 
            @click="handleLogout"
            class="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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