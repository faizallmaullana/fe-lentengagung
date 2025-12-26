import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '@/views/LandingView.vue'
import UserLayout from '@/layouts/UserLayout.vue'
import DashboardView from '@/views/user/DashboardView.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'
import MaintenanceView from '@/views/MaintenanceView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // --- Rute Halaman Depan (Public) ---
    {
      path: '/',
      name: 'LandingPage',
      component: LandingView,
      meta: { 
        title: 'Beranda',
        guest: true // Boleh diakses siapa saja, tapi kalau sudah login redirect ke dashboard
      }
    },

    // --- Rute Login ---
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { 
        title: 'Masuk',
        guest: true 
      }
    },

    // --- Rute Register ---
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { 
        title: 'Pendaftaran Warga', 
        guest: true 
      }
    },

    // --- RUTE ADMIN (Protected) ---
    {
      path: '/admin',
      component: AdminLayout, // Menggunakan Layout Admin yang punya Sidebar Petugas
      meta: { requiresAuth: true, role: 'petugas' },
      children: [
        {
          path: 'antrian', // Akses via /admin/antrian
          name: 'AdminQueue',
          component: () => import('@/views/admin/AntrianView.vue'), // Dashboard Admin
          meta: { title: 'Antrian Verifikasi' }
        },

        {
          path: 'verifikasi/:id',
          name: 'AdminVerifikasi',
          component: () => import('@/views/admin/VerifikasiView.vue'),
          meta: { title: 'Detail Verifikasi' }
        },
        
        {
          path: 'arsip',
          name: 'AdminArsip',
          component: () => import('@/views/admin/ArsipView.vue'),
          meta: { title: 'Arsip Dokumen' }
        }
      ]
    },

    {
      path: '/maintenance',
      name: 'Maintenance',
      component: MaintenanceView,
      meta: { title: 'Dalam Perbaikan', guest: true }
    },
    
    // --- Rute Dashboard Warga (Protected) ---
    {
      path: '/dashboard',
      component: UserLayout,
      meta: { 
        requiresAuth: true, // WAJIB LOGIN
        role: 'warga'       // WAJIB ROLE WARGA
      },
      children: [
        {
          path: '', 
          name: 'UserDashboard',
          component: DashboardView,
          meta: { title: 'Dashboard Warga' }
        },
        // Nanti tambah rute formulir di sini
        {
          path: 'pengajuan', 
          name: 'PengajuanBaru',
          component: () => import('@/views/user/PengajuanFormView.vue'),
          meta: { title: 'Formulir Pengajuan' }
        },
        
        {
          path: 'riwayat', 
          name: 'RiwayatPengajuan',
          component: () => import('@/views/user/RiwayatView.vue'),
          meta: { title: 'Riwayat Permohonan' }
        }
      ]
    }
  ],
})

// --- GLOBAL NAVIGATION GUARD (PENJAGA PINTU) ---
router.beforeEach((to, from, next) => {
  // Panggil store di dalam guard
  const authStore = useAuthStore()
  
  // 1. Update Judul Browser
  document.title = (to.meta.title ? to.meta.title + ' - ' : '') + 'Siwaris - Kelurahan Lenteng Agung'

  // 2. Cek apakah halaman butuh login (requiresAuth)
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Jika belum login, tendang ke halaman login
    return next('/login')
  }

  // 3. Cek apakah user sudah login tapi mau buka halaman guest (Login/Register/Landing)
  if (to.meta.guest && authStore.isAuthenticated) {
    // Jika sudah login, jangan kasih masuk ke halaman login lagi.
    // Arahkan ke dashboard yang sesuai.
    if (authStore.isAdmin) {
      return next('/admin/antrian') // Jika admin
    } else {
      return next('/dashboard') // Jika warga
    }
  }

  // 4. Lolos semua cek, silakan masuk
  next()
})

export default router