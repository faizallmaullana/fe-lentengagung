# Pengajuan Form View Test Plan

## Purpose
Ensure the pengajuan form keeps a clean slate for manual KTP input, accepts the provided OCR payload, and displays all fields that exist on the JSON so that QA can validate both manual and automated flows.

## Scope
- `PengajuanFormView.vue` (user-facing multi-step form)
- OCR sample loader button and reset helper
- Form validation for each step and document uploads

## Test Environment
- Node.js 20+ (per package)
- `npm install`
- `npm run dev` to boot the Vite server
- Browser: Chromium-based or Firefox for clipboard API support

## Test Cases
| ID | Title | Steps | Expected Result |
| --- | ----- | ----- | --------------- |
| TC-01 | Reset form to empty | 1. Load page and approve to unlock form. 2. Click **Kosongkan form untuk input KTP**. | All pewaris fields (including agama, pekerjaan, jenis kelamin, status perkawinan, rt/rw, tempat & tanggal lahir) and dynamic lists clear to defaults; files cleared. |
| TC-02 | Fill from new OCR JSON | 1. Click **Isi dari JSON contoh**. 2. Confirm alert; check clipboard if supported. | All pewaris inputs populate with normalized values (`NIK` 16 digits, `Nama` sanitized, address set, plus agama, golongan darah, jenis kelamin, kecamatan, kelurahan/desa, pekerjaan, kewarganegaraan, status perkawinan, rt/rw, and birth data). Sample JSON is stored in `submissionPayload` for later use. |
| TC-03 | Validate override when uploading real file | 1. Upload KTP image through the scan area. 2. Ensure API response triggers `applyOcrParsed`. | Form fields update like TC-02 while `isScanning` spinner shows progress. If API returns JSON string, it still parses. |
| TC-04 | Clipboard fallback | 1. Trigger **Isi dari JSON contoh** in a browser without clipboard privileges. | No crash/log errors; alert still displays and form fields fill even if clipboard write fails. |
| TC-05 | Manual editing plus validation | 1. Edit each field, ensuring `NIK` remains 16 digits, required fields filled, documents uploaded. 2. Advance through steps. | Steps advance smoothly; validations trigger warnings when data missing or invalid; final submit flow reaches confirmation modal. |

## Notes
- The clipboard-copy attempt is best-effort; verify `navigator.clipboard.writeText` does not throw in browsers without secure context.
- If multiple OCR payloads appear, `preparedJson` should always reflect the latest wrapper for reference.
