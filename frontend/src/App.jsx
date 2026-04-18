import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { ApplicationProvider } from "./context/ApplicationContext"
import ProtectedRoute from "./components/auth/ProtectedRoute"

// Auth
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import StaffLogin from "./pages/auth/StaffLogin"
import AdminLogin from "./pages/auth/AdminLogin"

// Applicant
import Dashboard from "./pages/applicant/Dashboard"
import MyApplications from "./pages/applicant/applications/MyApplications";
import ApplicationRouter from "./pages/applicant/ApplicationRouter"
import ViewApplication from "./pages/applicant/applications/ViewApplication"

// Apply flow
import TransactionSelection from "./pages/applicant/apply/TransactionSelection"
import RetrieveRecord from "./pages/applicant/apply/RetrieveRecord"
import SupportingChanges from "./pages/applicant/apply/SupportingChanges"
import ConfirmTransaction from "./pages/applicant/apply/ConfirmTransaction"
import DocumentUpload from "./pages/applicant/apply/DocumentUpload"
import Verification from "./pages/applicant/apply/Verification"
import Review from "./pages/applicant/apply/Review"
import Declaration from "./pages/applicant/apply/Declaration"
import Payment from "./pages/applicant/apply/Payment"
import Success from "./pages/applicant/apply/Success"

function App() {
  return (
    <AuthProvider>
      <ApplicationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Applicant Dashboard */}
            <Route path="/dashboard" element={
              <ProtectedRoute role="applicant">
                <Dashboard />
              </ProtectedRoute>
            } />

            {/* Application router — resumes draft or redirects to view */}
            <Route path="/applications/:id" element={
              <ProtectedRoute role="applicant">
                <ApplicationRouter />
              </ProtectedRoute>
            } />

            <Route path="/applications" element={<MyApplications />} />


            {/* View application detail */}
            <Route path="/applications/:id/view" element={
              <ProtectedRoute role="applicant">
                <ViewApplication />
              </ProtectedRoute>
            } />

            {/* Application Flow */}
            <Route path="/apply" element={
              <ProtectedRoute role="applicant">
                <TransactionSelection />
              </ProtectedRoute>
            } />
            <Route path="/apply/retrieve-record" element={
              <ProtectedRoute role="applicant">
                <RetrieveRecord />
              </ProtectedRoute>
            } />
            <Route path="/apply/supporting-changes" element={
              <ProtectedRoute role="applicant">
                <SupportingChanges />
              </ProtectedRoute>
            } />
            <Route path="/apply/confirm-transaction" element={
              <ProtectedRoute role="applicant">
                <ConfirmTransaction />
              </ProtectedRoute>
            } />
            <Route path="/apply/document-upload" element={
              <ProtectedRoute role="applicant">
                <DocumentUpload />
              </ProtectedRoute>
            } />
            <Route path="/apply/verification" element={
              <ProtectedRoute role="applicant">
                <Verification />
              </ProtectedRoute>
            } />
            <Route path="/apply/review" element={
              <ProtectedRoute role="applicant">
                <Review />
              </ProtectedRoute>
            } />
            <Route path="/apply/declaration" element={
              <ProtectedRoute role="applicant">
                <Declaration />
              </ProtectedRoute>
            } />
            <Route path="/apply/payment" element={
              <ProtectedRoute role="applicant">
                <Payment />
              </ProtectedRoute>
            } />
            <Route path="/apply/success" element={
              <ProtectedRoute role="applicant">
                <Success />
              </ProtectedRoute>
            } />

          </Routes>
        </BrowserRouter>
      </ApplicationProvider>
    </AuthProvider>
  )
}

export default App