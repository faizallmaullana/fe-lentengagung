# Dokumentasi Rencana Pengujian Black-Box
**Proyek: Sistem Pengajuan Ahli Waris - Kelurahan Lenteng Agung**

## 1. Pendahuluan
Dokumen ini merinci skenario pengujian unit secara fungsional (Black-Box) untuk memastikan seluruh alur aplikasi berjalan sesuai kebutuhan pengguna, mulai dari pendaftaran akun hingga pelacakan status pengajuan.

---

## 2. Skenario Pengujian

### A. Registrasi & Autentikasi (Login)
| ID | Fitur | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | Registrasi | Isi form daftar dengan NIK, Email, dan Password baru. | Akun terbuat, diarahkan ke halaman Login/Dashboard. |
| **AUTH-02** | Login | Masuk dengan Email dan Password yang benar. | Berhasil masuk ke Dashboard User. |
| **AUTH-03** | Validasi Login | Masuk dengan Password yang salah. | Muncul pesan error "Kredensial tidak valid". |

### B. Pengisian Data & OCR (Step 1 - 3)
| ID | Fitur | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **FORM-01** | OCR KTP | Klik "Scan KTP Otomatis" atau tombol contoh JSON. | Data Nama, NIK, dan Alamat terisi otomatis & bersih dari simbol aneh. |
| **FORM-02** | Input Manual | Isi manual data Pewaris, Ahli Waris, dan Harta. | Input dapat berjalan lancar (teks/angka sesuai tipe). |
| **FORM-03** | Validasi NIK | Isi NIK kurang atau lebih dari 16 digit. | Muncul peringatan "NIK harus 16 digit". |
| **FORM-04** | Draft | Keluar dari browser saat mengisi form lalu kembali. | (Opsional/Jika diimplementasi) Data tersimpan sebagai draft. |

### C. Manajemen Dokumen & Upload (Step 4)
| ID | Fitur | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **FILE-01** | Upload File | Pilih file PDF/IMG untuk KTP, KK, dan Surat Kematian. | File terpilih dan nama file muncul di UI. |
| **FILE-02** | Batas Ukuran | Upload file di atas 5MB. | Muncul pesan "File Terlalu Besar (Maksimal 5MB)". |

### D. List Pengajuan & Draft (Dashboard)
| ID | Fitur | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **LIST-01** | Lihat Riwayat | Buka menu "Riwayat" atau "Dashboard". | Menampilkan daftar pengajuan yang sedang diproses/selesai. |
| **LIST-02** | Detail Draft | Klik pengajuan yang belum selesai dikirim. | Mengarahkan kembali ke form dengan data lama yang tersimpan. |

### E. Generate File & Submit
| ID | Fitur | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **SUB-01** | Submit Akhir | Klik "Kirim Permohonan" dan konfirmasi di Dialog. | Data terkirim ke server, status berubah jadi "Menunggu Verifikasi". |
| **SUB-02** | Generate PDF | Klik "Cetak Preview" atau setelah submit sukses. | Sistem mengunduh file PDF ringkasan pengajuan secara otomatis. |

---

## 3. Hal-Hal Penting yang Perlu Ada (Rekomendasi)
Untuk meningkatkan kualitas aplikasi, berikut adalah hal yang sebaiknya dipastikan tersedia:

1.  **Notifikasi Real-time**: User mendapat alert (email/push) jika status pengajuan berubah dari "Proses" menjadi "Disetujui" atau "Ditolak".
2.  **Keamanan Sesi**: Otomatis logout jika user tidak aktif dalam waktu lama (misal 30 menit).
3.  **Responsive Design**: Pastikan form mudah diisi melalui HP karena banyak user melakukan foto KTP langsung dari kamera ponsel.
4.  **Halaman Error (404/500)**: Jika server down atau halaman tidak ditemukan, user diarahkan ke halaman maintenance yang informatif.
5.  **Log Aktifitas**: Mencatat kapan user mengunggah file atau mengubah data untuk kebutuhan audit internal kelurahan.
