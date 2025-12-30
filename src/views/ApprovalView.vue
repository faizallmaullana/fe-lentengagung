<template>
  <div class="approval-page">
    <h2>Verifikasi Email</h2>
    <p>Masukkan kode 6 digit yang dikirim ke email Anda.</p>

    <form @submit.prevent="submitCode" class="form">
      <div style="display:flex;flex-direction:column;gap:10px;align-items:center;">
        <label style="font-size:14px;color:#334155">Token Verifikasi</label>
        <input v-model="tokenField" placeholder="Tempel token registrasi di sini" style="width:100%;max-width:520px;padding:10px;border:1px solid #ddd;border-radius:8px;" />
        <div class="actions">
          <button type="submit" :disabled="!tokenAvailable">Verifikasi</button>
        </div>
      </div>
    </form>

    <p class="message" v-if="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiPost } from '@/axios'
const tokenField = ref('')
const message = ref('')

const route = useRoute()
const router = useRouter()

const tokenAvailable = computed(() => {
  return Boolean(tokenField.value || route.query?.token || localStorage.getItem('approvalToken'))
})

onMounted(() => {
  try {
    console.debug('[ApprovalView] route.query:', route.query)
    console.debug('[ApprovalView] local approvalToken:', localStorage.getItem('approvalToken'))
    console.debug('[ApprovalView] local approvalEmail (ignored):', localStorage.getItem('approvalEmail'))
  } catch (e) {
    console.debug('[ApprovalView] unable to read localStorage or route:', e)
  }
})

function resolveToken() {
  return tokenField.value || route.query?.token || localStorage.getItem('approvalToken') || ''
}

async function submitCode() {
  const token = resolveToken()

  if (!token) {
    console.error('[ApprovalView] token missing')
    message.value = 'Token verifikasi tidak ditemukan. Mohon tempel token atau buka link verifikasi dari email Anda.'
    return
  }


  message.value = 'Mengirim token…'
  try {
    const payload = { token }
    console.debug('[ApprovalView] sending /auth/approve payload:', payload)
    // Use app auth token from localStorage for Authorization header
    const appAuthToken = localStorage.getItem('authToken') || ''
    console.debug('[ApprovalView] using app auth token from localStorage (present):', !!appAuthToken)
    const res = await apiPost(
      '/auth/approve',
      payload,
      { headers: { Authorization: appAuthToken ? `Bearer ${appAuthToken}` : undefined } }
    )
    console.debug('[ApprovalView] /auth/approve response:', res)
    message.value = 'Verifikasi berhasil. Anda akan diarahkan.'
    setTimeout(() => router.push('/login'), 900)
  } catch (err) {
    console.error('[ApprovalView] /auth/approve error:', err)
    message.value = err?.message || 'Gagal verifikasi. Coba lagi.'
  }
}
</script>

<style scoped>
.approval-page {
  max-width: 520px;
  margin: 40px auto;
  padding: 20px;
}
.code-inputs {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 18px 0;
}
.digit {
  width: 48px;
  height: 56px;
  font-size: 28px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.actions { text-align: center; margin-top: 8px }
button[disabled] { opacity: 0.6 }
.message { margin-top: 12px; color: #333 }
</style>
