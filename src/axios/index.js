// src/axios/index.js
import axios from 'axios'

// Base URL comes from Vite env (VITE_API_URL) or falls back to a sensible default
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:9090/api'

// Create axios instance
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10s timeout as reasonable default
})

// Helper: attach token from localStorage (if exists)
function attachToken(config = {}) {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

// Request interceptor: ensure token added to every request
api.interceptors.request.use(
  (config) => attachToken(config),
  (error) => Promise.reject(error)
)

// Response interceptor: handle auth errors globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      // Clear auth info and redirect to login (frontend simple fallback)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('loginTime')
      try {
        window.location.href = '/login'
      } catch (e) {
        // ignore in non-browser environments
      }
    }
    return Promise.reject(error)
  }
)

// Simple helpers that return the response data or throw a meaningful error
async function apiGet(url, config = {}) {
  try {
    const response = await api.get(url, attachToken(config))
    return response.data
  } catch (err) {
    throw simplifyError(err)
  }
}

async function apiPost(url, payload, config = {}) {
  try {
    const response = await api.post(url, payload, attachToken(config))
    return response.data
  } catch (err) {
    throw simplifyError(err)
  }
}

async function apiPut(url, payload, config = {}) {
  try {
    const response = await api.put(url, payload, attachToken(config))
    return response.data
  } catch (err) {
    throw simplifyError(err)
  }
}

async function apiDelete(url, config = {}) {
  try {
    const response = await api.delete(url, attachToken(config))
    return response.data
  } catch (err) {
    throw simplifyError(err)
  }
}

function simplifyError(err) {
  // Prefer server message if available
  const serverMessage = err?.response?.data?.message || err?.response?.data || null
  const message = serverMessage || err.message || 'Unknown error'
  const errorObj = new Error(message)
  errorObj.status = err?.response?.status
  errorObj.original = err
  return errorObj
}

// Allow manual setting of Authorization header for e.g. after login
function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    localStorage.setItem('token', token)
  } else {
    delete api.defaults.headers.common.Authorization
    localStorage.removeItem('token')
  }
}

export default api
export { apiGet, apiPost, apiPut, apiDelete, setAuthToken }