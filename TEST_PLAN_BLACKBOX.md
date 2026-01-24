# Black-Box Test Plan: Pengajuan Waris Form

## 1. Introduction
This test plan focuses on validating the user interface and functional flows of the **Pengajuan Waris** form from an end-user perspective. The goal is to ensure that users can successfully submit applications, use the automated OCR feature, and receive appropriate feedback without knowledge of the internal code structure.

## 2. Test Scope
- **User Approval Flow**: Confirmation of terms before accessing the form.
- **Multistep Navigation**: Progressing through steps 1-4.
- **OCR Automation**: Scannning KTP and verifying the autofill behavior.
- **Data Validation**: Enforcing required fields and correct formats (e.g., 16-digit NIK).
- **File Uploads**: Validating file size and presence.
- **Submission**: Final confirmation and redirect.

## 3. Test Cases (Black-Box)

| Case ID | Feature | Test Description | Input/Action | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **BB-01** | Approval | Unlock form access | Click "Saya Bersedia Mengikuti Proses Pengajuan" | System displays Step 1 of the form. |
| **BB-02** | OCR Autofill | Scan KTP via UI | 1. Click scan area or "Isi dari JSON contoh". 2. Wait for processing. | NIK, Name, and Address fields populate correctly. Data is sanitized (excess symbols removed). |
| **BB-03** | Step 1 Validation | Missing NIK/Name | Leave NIK/Name blank and click "Lanjut". | Error alert: "Semua data pewaris wajib diisi." |
| **BB-04** | NIK Format | Invalid NIK length | Enter "123" (3 digits) in NIK field and click "Lanjut". | Error alert: "NIK harus 16 digit." |
| **BB-05** | Dynamic Lists | Add/Remove Ahli Waris | 1. Click "+ Tambah". 2. Click "✕" on a row. | A new row appears; row is removed. Minimum 1 row enforcement. |
| **BB-06** | Asset List | Add/Remove Harta | 1. Click "+ Tambah". 2. Click "✕" on a row. | Row added/removed. Minimum 1 asset enforcement. |
| **BB-07** | Navigation | Back/Forward persistence | Fill Step 1, go to Step 2, then click "Kembali". | Data in Step 1 remains filled. |
| **BB-08** | File Type/Size | Upload large file | Upload a file > 5MB to any document slot. | System triggers "File Terlalu Besar (Maksimal 5MB)". |
| **BB-09** | Missing Docs | Submit with incomplete files | Fill Data, but skip "Surat Kematian". Click "Kirim". | Error alert: "Wajib upload semua dokumen." |
| **BB-10** | Final Submit | Success scenario | 1. Fill all steps. 2. Upload all files. 3. Click "Kirim Permohonan" -> "Ya, Kirim!". | Success message appears and user is redirected to Dashboard. |

## 4. Test Environment
- **Platform**: Web Browser (Chrome, Edge, Safari, Firefox).
- **Network**: Internet connection for API calls (Axios).
- **Data**: Test JSON payload for OCR validation.

## 5. Pass/Fail Criteria
- **Pass**: All required fields stop the user if empty, and correct data allows progression. OCR fills the UI correctly.
- **Fail**: Form allows empty submissions, OCR fails to populate UI, or navigation breaks.
