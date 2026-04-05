import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

// Auth
import Login from "./pages/auth/Login"

// Applicant
// import Dashboard from "./pages/applicant/Dashboard"

// Officer
// import OfficerDashboard from "./pages/officer/OfficerDashboard"

// Supervisor
// import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard"

// Admin
// import AdminDashboard from "./pages/admin/AdminDashboard"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Applicant — uncomment as you build */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}

        {/* Officer — uncomment as you build */}
        {/* <Route path="/officer" element={<OfficerDashboard />} /> */}

        {/* Supervisor — uncomment as you build */}
        {/* <Route path="/supervisor" element={<SupervisorDashboard />} /> */}

        {/* Admin — uncomment as you build */}
        {/* <Route path="/admin" element={<AdminDashboard />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App