// Auth context — stores the logged-in user, handles login/logout, and exposes role checks.
import { createContext, useContext, useState, useEffect } from "react"
import { getMe } from "../services/authService"

const AuthContext = createContext(null)

function tokenKey(role) {
  if (role === "officer")    return "token_officer"
  if (role === "supervisor") return "token_supervisor"
  return "token_applicant"
}
function userKey(role) {
  if (role === "officer")    return "user_officer"
  if (role === "supervisor") return "user_supervisor"
  return "user_applicant"
}

function getStoredToken() {
  const path = window.location.pathname
  if (path.startsWith("/officer"))    return sessionStorage.getItem("token_officer")    || sessionStorage.getItem("token") || null
  if (path.startsWith("/supervisor")) return sessionStorage.getItem("token_supervisor") || sessionStorage.getItem("token") || null
  return localStorage.getItem("token_applicant") || localStorage.getItem("token") || sessionStorage.getItem("token_officer") || sessionStorage.getItem("token_supervisor") || null
}

function clearStoredAuth() {
  ["token_applicant","user_applicant"].forEach(k => localStorage.removeItem(k))
  ["token_officer","user_officer","token_supervisor","user_supervisor"].forEach(k => sessionStorage.removeItem(k))
  // clear legacy keys too just in case
  localStorage.removeItem("token");  localStorage.removeItem("user")
  sessionStorage.removeItem("token"); sessionStorage.removeItem("user")
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredToken()
    if (token) {
      getMe()
        .then((data) => setUser(data.user))
        .catch(() => {
          clearStoredAuth()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (userData, token, useSession = false) => {
    const role = userData?.role
    if (useSession) {
      sessionStorage.setItem(tokenKey(role), token)
      sessionStorage.setItem(userKey(role), JSON.stringify(userData))
    } else {
      localStorage.setItem(tokenKey(role), token)
      localStorage.setItem(userKey(role), JSON.stringify(userData))
    }
    setUser(userData)
  }

  const logout = () => {
    clearStoredAuth()
    setUser(null)
  }

  const isAuthenticated = !!user
  const hasRole = (role) => user?.role === role || user?.roles?.includes(role)

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, isAuthenticated, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}