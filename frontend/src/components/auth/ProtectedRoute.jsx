import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, hasRole, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && !hasRole(role)) return <Navigate to="/login" replace />;

  return children;
}