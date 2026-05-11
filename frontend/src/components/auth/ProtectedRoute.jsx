// Redirects unauthenticated users or wrong-role users away from protected pages.
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const STAFF_ROLES = ["officer", "supervisor", "admin"];

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, hasRole, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    const redirectTo = role && STAFF_ROLES.includes(role) ? "/staff/login" : "/login";
    return <Navigate to={redirectTo} replace />;
  }

  if (role && !hasRole(role)) {
    const redirectTo = STAFF_ROLES.includes(role) ? "/staff/login" : "/login";
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}