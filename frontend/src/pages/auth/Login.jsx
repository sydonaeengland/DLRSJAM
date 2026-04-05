import { useState } from "react"
import axios from "axios"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await axios.post("http://127.0.0.1:5000/api/auth/login", {
        email,
        password,
      })

      // Store token and user info
      localStorage.setItem("token", res.data.token)
      localStorage.setItem("user", JSON.stringify(res.data.user))

      // Redirect based on role
      const role = res.data.user.role
      if (role === "officer") window.location.href = "/officer"
      else if (role === "supervisor") window.location.href = "/supervisor"
      else if (role === "admin") window.location.href = "/admin"
      else window.location.href = "/dashboard"

    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-xs tracking-widest text-blue-900 font-bold mb-1">
            GOVERNMENT OF JAMAICA
          </div>
          <div className="text-xs tracking-widest text-gray-500 mb-4">
            TAX ADMINISTRATION JAMAICA
          </div>
          <h1 className="text-2xl font-bold text-blue-900">DLRSJAM</h1>
          <p className="text-sm text-gray-500 mt-1">
            Driver's Licence Renewal System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 text-white font-semibold py-2.5 rounded-lg text-sm tracking-wide hover:bg-blue-800 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Register link — applicants only */}
        <p className="text-center text-sm text-gray-500 mt-6">
          New applicant?{" "}
          <a href="/register" className="text-blue-700 font-medium hover:underline">
            Create an account
          </a>
        </p>

      </div>
    </div>
  )
}