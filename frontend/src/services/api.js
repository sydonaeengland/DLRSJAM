import axios from "axios"

const api = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
})

// pick the right token depending on which portal this tab is on
function getToken() {
  const path = window.location.pathname
  if (path.startsWith("/officer"))    return sessionStorage.getItem("token_officer")    || sessionStorage.getItem("token") || null
  if (path.startsWith("/supervisor")) return sessionStorage.getItem("token_supervisor") || sessionStorage.getItem("token") || null
  // applicant routes (including /apply, /dashboard, /applications, /staff/login)
  return localStorage.getItem("token_applicant") || localStorage.getItem("token") || sessionStorage.getItem("token_officer") || sessionStorage.getItem("token_supervisor") || null
}

function clearAuth() {
  ["token_applicant","user_applicant"].forEach(k => localStorage.removeItem(k))
  ["token_officer","user_officer","token_supervisor","user_supervisor"].forEach(k => sessionStorage.removeItem(k))
  localStorage.removeItem("token");  localStorage.removeItem("user")
  sessionStorage.removeItem("token"); sessionStorage.removeItem("user")
}

// attach token to every request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// redirect to login on 401 — token expired or invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const wasStaff = !!(sessionStorage.getItem("token_officer") || sessionStorage.getItem("token_supervisor") || sessionStorage.getItem("token"))
      clearAuth()
      window.location.href = wasStaff ? "/staff/login" : "/login"
    }
    return Promise.reject(error)
  }
)

export default api