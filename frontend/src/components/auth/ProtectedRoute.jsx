import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Wrap any route element with this component to require authentication.
 * Unauthenticated users are redirected to /login, and the intended URL is
 * preserved in `location.state.from` so LoginPage can redirect back after sign-in.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // While the session is being verified against the backend, show a neutral loader
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#176B45]/30 border-t-[#176B45]" />
          <p className="text-xs text-[#161412]/50 font-mono uppercase tracking-widest">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
