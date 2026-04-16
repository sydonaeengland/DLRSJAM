import { createContext, useContext, useState, useEffect } from "react"
import { getMe } from "../services/authService"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On app load — check if token exists and fetch user
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      getMe()
        .then((data) => {
          setUser(data.user)
        })
        .catch(() => {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (userData, token) => {
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
  }

  const isAuthenticated = !!user

  const hasRole = (role) => user?.role === role || user?.roles?.includes(role)

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}