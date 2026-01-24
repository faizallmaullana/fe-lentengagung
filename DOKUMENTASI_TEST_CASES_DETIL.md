# Dokumentasi Test Case Detil & Status Pengujian
**Proyek: Sistem Pengajuan Ahli Waris - Kelurahan Lenteng Agung**
**Versi Dokumen:** 2.0
**Tanggal Uji Terakhir:** 12 Januari 2026

Dokumen ini berisi matriks pengujian lengkap (Black-Box) mencakup validasi input, alur proses, respons sistem, dan status kelulusan pengujian (Pass/Fail) untuk setiap fitur utama.

---

## 1. Modul: Registrasi & Autentikasi Pengguna
*Fokus: Validasi data pengguna baru, keamanan login, dan penanganan kesalahan input.*

| ID | Fitur | Skenario Uji | Data Masukan (Input) | Langkah Pengujian | Hasil yang Diharapkan | Status | Catatan |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **AUTH-01** | Register | Pendaftaran Akun Baru (Happy Path) | NIK: 16 Digit Valid, Email: Baru, Pass: 8 Karakter | Isi form lengkap -> Klik "Daftar" | Akun berhasil dibuat, redirect ke Login/Dashboard, email verifikasi terkirim. | [ ] | |
| **AUTH-02** | Register | Validasi Format NIK (Kurang Digit) | NIK: "123456" (6 digit) | Isi NIK pendek -> Klik "Daftar" | Sistem menolak submit, tampil alert merah "NIK harus terdiri dari 16 digit". | [ ] | |
| **AUTH-03** | Register | Validasi Format NIK (Bukan Angka) | NIK: "1234AB56" | Isi huruf di kolom NIK | Kolom tidak menerima input huruf atau tampil error validasi tipe data. | [ ] | |
| **AUTH-04** | Register | Validasi Email Duplikat | Email: "user@test.com" (Sudah ada di DB) | Isi email lama -> Klik "Daftar" | Muncul pesan error "Email sudah terdaftar. Silakan login." | [ ] | |
| **AUTH-05** | Login | Login Sukses | Email & Pass Valid | Masukkan data -> Klik "Masuk" | Berhasil masuk ke Dashboard User, menu sesuai hak akses. | [ ] | |
| **AUTH-06** | Login | Login Gagal (Password Salah) | Email Valid, Pass: "Salah123" | Masukkan data -> Klik "Masuk" | Muncul pesan error "Kredensial tidak valid" atau "Password salah". | [ ] | |
| **AUTH-07** | Login | Login Gagal (Akun Tidak Ditemukan) | Email: "ghost@test.com" | Masukkan data -> Klik "Masuk" | Muncul pesan error "Akun belum terdaftar". | [ ] | |
| **AUTH-08** | Logout | Keluar dari Sistem | - | Klik tombol "Keluar" di dashboard | Redirect ke halaman Login, sesi dihapus (tidak bisa 'Back'). | [ ] | |

---

## 2. Modul: Step 1 - Data Pewaris (OCR & Manual)
*Fokus: Akurasi pembacaan KTP otomatis, normalisasi data, dan validasi form wajib.*

| ID | Fitur | Skenario Uji | Data Masukan (Input) | Langkah Pengujian | Hasil yang Diharapkan | Status | Catatan |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **PEW-01** | OCR Scan | Upload KTP yang Jelas | File: `KTP_Jelas.jpg` (High Res) | Klik "Scan KTP" -> Pilih File | Spinner loading muncul -> Form Nama, NIK, Alamat, TTL terisi otomatis. | [ ] | |
| **PEW-02** | OCR Scan | Upload KTP Buram/Gelap | File: `KTP_Blur.jpg` | Klik "Scan KTP" -> Pilih File | Sistem mencoba proses -> Jika gagal, muncul info "Gagal membaca KTP, isi manual". | [ ] | |
| **PEW-03** | OCR Scan | Upload File Bukan Gambar | File: `Dokumen.pdf` / `Data.txt` | Upload di input KTP (Image Only) | Input menolak file atau muncul pesan "Format harus JPG/PNG". | [ ] | |
| **PEW-04** | Input Manual | Validasi NIK Pewaris Manual | NIK: 16 Digit (Manual) | Ketik manual di kolom NIK | Tidak ada error. Jika digit != 16, tombol "Lanjut" disabled/alert muncul. | [ ] | |
| **PEW-05** | Input Manual | Tanggal Meninggal (Wajib) | Kosongkan Tgl Meninggal | Klik "Lanjut" | Muncul validasi "Tanggal Meninggal wajib diisi". | [ ] | |
| **PEW-06** | Reset Form | Fitur Kosongkan Form | - | Klik tombol "Kosongkan Form" | Seluruh field (NIK, Nama, dll) kembali kosong/default. | [ ] | |
| **PEW-07** | Data Lengkap | Navigasi ke Step 2 (Sukses) | Semua field required terisi | Klik tombol "Lanjut" | Berhasil pindah ke tab "Ahli Waris", scroll otomatis ke atas. | [ ] | |

---

## 3. Modul: Step 2 - Data Ahli Waris (Dynamic List)
*Fokus: Kemampuan menambah/menghapus baris penerima waris dan kelengkapan data tiap baris.*

| ID | Fitur | Skenario Uji | Data Masukan (Input) | Langkah Pengujian | Hasil yang Diharapkan | Status | Catatan |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **AHLI-01** | Tambah Row | Menambah Ahli Waris Baru | - | Klik tombol "+ Tambah" | Baris form baru muncul di bawah baris pertama. | [ ] | |
| **AHLI-02** | Hapus Row | Menghapus Ahli Waris Salah | Ada 2 baris data | Klik "✕" pada baris kedua | Baris kedua hilang, sisa baris pertama saja. | [ ] | |
| **AHLI-03** | Validasi Row | Hapus Row Terakhir (Sisa 1) | Hanya ada 1 baris | Klik "✕" pada baris tersebut | Action ditolak, muncul alert "Minimal harus ada 1 ahli waris". | [ ] | |
| **AHLI-04** | Form Validasi | Salah satu data belum lengkap | Row 1: Nama diisi, Hubungan kosong | Klik "Lanjut" | Muncul pesan "Lengkapi data Ahli Waris baris ke-1". | [ ] | |
| **AHLI-05** | Navigasi | Navigasi ke Step 3 (Sukses) | Semua field terisi lengkap | Klik tombol "Lanjut" | Berhasil pindah ke tab "Harta Warisan". | [ ] | |

---

## 4. Modul: Step 3 - Harta Warisan (Dynamic List)
*Fokus: Pencatatan aset yang akan diwariskan.*

| ID | Fitur | Skenario Uji | Data Masukan (Input) | Langkah Pengujian | Hasil yang Diharapkan | Status | Catatan |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **ASSET-01** | Tambah Aset | Input Aset Berbeda Jenis | Aset 1: Tanah, Aset 2: Motor | Tambah row & isi dropdown "Jenis" | Dropdown berfungsi, pilihan tersimpan sesuai input. | [ ] | |
| **ASSET-02** | Kelengkapan | Deskripsi/No Surat Kosong | Row 1: Deskripsi kosong | Klik "Lanjut" | Muncul validasi "Deskripsi harta harus diisi". | [ ] | |
| **ASSET-03** | Navigasi | Navigasi ke Step 4 (Sukses) | Minimal 1 aset valid | Klik tombol "Lanjut" | Berhasil pindah ke tab "Upload Dokumen". | [ ] | |

---

## 5. Modul: Step 4 - Dokumen Pendukung & Submit
*Fokus: Validasi file (ukuran, tipe) dan pengiriman data final ke server.*

| ID | Fitur | Skenario Uji | Data Masukan (Input) | Langkah Pengujian | Hasil yang Diharapkan | Status | Catatan |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **DOC-01** | Upload File | Upload Dokumen Valid | File: PDF/JPG (< 2MB) | Pilih file di input "KTP Pewaris" | File terbaca, nama file tampil, tidak ada error. | [ ] | |
| **DOC-02** | Validasi Size | Upload File Oversize | File: Video/Gambar (> 5MB) | Pilih file besar | Muncul alert "File terlalu besar (Max 5MB)", input di-reset. | [ ] | |
| **DOC-03** | Validasi Tipe | Upload File Salah Format | File: `.exe` / `.zip` | Pilih diperbolehkan? | Sebaiknya ditolak atau terima tapi validasi di server (Expect: JPG/PDF only). | [ ] | |
| **DOC-04** | Submit Gagal | Dokumen Kurang Lengkap | Upload KTP saja, KK kosong | Klik "Kirim Permohonan" | Muncul error "Mohon lengkapi semua dokumen wajib". | [ ] | |
| **DOC-05** | Submit Sukses | Pengiriman Data Final | Semua data & dokumen lengkap | 1. Klik "Kirim" -> 2. Konfirmasi "Ya" | Loading spinner muncul -> Sukses -> Redirect ke Dashboard. | [ ] | |

---

## 6. Modul: Dashboard, History & Generate Output
*Fokus: Pelacakan status pengajuan dan pengunduhan hasil akhir.*

| ID | Fitur | Skenario Uji | Data Masukan (Input) | Langkah Pengujian | Hasil yang Diharapkan | Status | Catatan |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **DASH-01** | List Riwayat | Cek Status Pengajuan Baru | - | Buka menu "History" | Pengajuan baru muncul dengan status "Menunggu Verifikasi" / "Proses". | [ ] | |
| **DASH-02** | Detail View | Melihat Detail Pengajuan | Klik ID Pengajuan/Row | Klik salah satu item | Halaman detail terbuka menampilkan data readonly yang sudah diinput. | [ ] | |
| **DASH-03** | Generate File | Download Surat (Draft/Final) | Pengajuan Status "Selesai" | Klik tombol "Download PDF" | File PDF terunduh, format rapi, data sesuai input form. | [ ] | |
| **DASH-04** | Draft Resume | Lanjut Pengisian (Draft) | Form belum disubmit | Login ulang -> Buka Form | Data step 1-3 yang sebelumnya diisi muncul kembali (Persistensi). | [ ] | |

---

## 7. Kesimpulan & Tanda Tangan
**Ringkasan Hasil Uji:**
- Total Test Case: 30
- Passed: ...
- Failed: ...
- Pending: ...

**Disetujui Oleh:**
*(Nama QA / Developer)*
...
