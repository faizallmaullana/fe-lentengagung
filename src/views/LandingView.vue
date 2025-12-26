<script setup>
import { useRouter } from 'vue-router'
// Mengambil gambar langsung dari folder assets Anda
import logoUrl from '@/assets/images/logo.png'
import heroBgUrl from '@/assets/images/hero-bg.png'

const router = useRouter()

const handleAjukan = () => {
  // OPSI 1: Normal (Ke Login)
  router.push('/login') 

  // OPSI 2: Maintenance Mode (Aktifkan ini kalau sedang ada server maintenance / perbaikan fitur)
  // router.push('/maintenance')
}
</script>

<template>
  <div class="flex flex-col min-h-screen font-sans text-slate-800">
    
    <nav class="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div class="container mx-auto px-6 py-3 flex items-center gap-4">
        <img :src="logoUrl" alt="Logo Kelurahan" class="h-12 w-auto object-contain" />
        <div class="leading-tight">
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Kelurahan</p>
          <p class="text-xl font-bold text-slate-800">Lenteng Agung</p>
        </div>
      </div>
    </nav>

    <header class="relative w-full h-[550px] flex items-center bg-slate-900">
        <div class="absolute inset-0 z-0">
            <img :src="heroBgUrl" alt="Background Gedung" class="w-full h-full object-cover opacity-60" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/40"></div>
        </div>

        <div class="container mx-auto px-6 relative z-10 text-white mt-10">
            <div class="max-w-2xl">
                <h1 class="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                    Permudah Urusan<br>Surat Waris Anda
                </h1>
                <p class="text-lg text-slate-200 mb-8 font-light max-w-lg">
                    Layanan cepat dan tepat untuk masyarakat
                </p>
                
                <button
                    @click="handleAjukan"
                    class="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-md shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                >
                    Ajukan Permohonan
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                </button>
            </div>
        </div>
    </header>

    <section class="py-16 bg-white">
        <div class="container mx-auto px-6 max-w-5xl">
            <h2 class="text-2xl font-bold mb-6 text-slate-900">Surat Pernyataan Waris</h2>
            <div class="text-slate-600 space-y-6 leading-relaxed text-justify">
                <p>
                    Surat Pernyataan Ahli Waris (SPAW) adalah dokumen krusial yang secara resmi mengidentifikasi dan mengesahkan individu-individu yang berhak menerima warisan (harta peninggalan) dari seseorang yang telah meninggal dunia (pewaris), khususnya bagi Warga Negara Indonesia (WNI) Pribumi.
                </p>
                <p>
                    Di Kelurahan Lenteng Agung, yang merupakan bagian dari Kecamatan Jagakarsa, Jakarta Selatan, SPAW ini berfungsi sebagai bukti legalitas yang menyatakan secara sebenar-benarnya siapa saja ahli waris yang sah, termasuk hubungan mereka dengan pewaris (misalnya: istri/suami, anak kandung, dll.). Dokumen ini dibuat oleh para ahli waris sendiri, yang kemudian disaksikan oleh saksi-saksi dan diketahui/diregistrasi oleh pejabat setempat, yaitu Lurah Lenteng Agung dan Camat Jagakarsa.
                </p>
            </div>
        </div>
    </section>

    <section class="pb-16 pt-8 bg-white">
        <div class="container mx-auto px-6 max-w-5xl">
            <h2 class="text-2xl font-bold mb-6 text-slate-900">Tata Cara Permohonan</h2>
            <div class="w-full h-96 bg-gray-200 rounded-sm"></div>
        </div>
    </section>

    <footer class="bg-gray-100 py-12 border-t border-gray-200">
        <div class="container mx-auto px-6 grid md:grid-cols-2 gap-10">
            <div class="flex gap-4 items-start">
                 <img :src="logoUrl" alt="Logo Footer" class="h-16 w-auto" />
                 <div class="text-sm text-slate-600">
                    <h3 class="font-bold text-slate-900 text-lg mb-2">Kelurahan<br>Lenteng Agung</h3>
                    <p class="leading-relaxed">
                        Jl. Agung Raya I No.9, RT.9/RW.2, Lenteng Agung, Kec. Jagakarsa, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12610
                    </p>
                 </div>
            </div>

            <div class="flex justify-start md:justify-end">
                 <div class="w-full md:w-2/3 h-40 bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-sm font-medium rounded-sm">
                    Maps Area
                 </div>
            </div>
        </div>
    </footer>

  </div>
</template>