
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const auth = useAuth?.() || {};
  const isLoggedIn = typeof auth.isLoggedIn === "function" ? auth.isLoggedIn : () => false;

  return isLoggedIn() ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default ProtectedRoute;
