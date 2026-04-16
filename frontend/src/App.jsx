import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/auth/ProtectedRoute"

// Auth
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import StaffLogin from "./pages/auth/StaffLogin"
import AdminLogin from "./pages/auth/AdminLogin"

// Applicant
import Dashboard from "./pages/applicant/Dashboard"

// Officer
// import OfficerDashboard from "./pages/officer/OfficerDashboard"

// Supervisor
// import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard"

// Admin
// import AdminDashboard from "./pages/admin/AdminDashboard"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Applicant */}
          <Route path="/dashboard" element={
            <ProtectedRoute role="applicant">
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Officer — uncomment as you build */}
          {/* <Route path="/officer" element={
            <ProtectedRoute role="officer">
              <OfficerDashboard />
            </ProtectedRoute>
          } /> */}

          {/* Supervisor — uncomment as you build */}
          {/* <Route path="/supervisor" element={
            <ProtectedRoute role="supervisor">
              <SupervisorDashboard />
            </ProtectedRoute>
          } /> */}

          {/* Admin — uncomment as you build */}
          {/* <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } /> */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App