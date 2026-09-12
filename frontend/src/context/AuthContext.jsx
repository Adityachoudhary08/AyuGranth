import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';
import { clearProductsCache } from '../api';

const TOKEN_KEY = 'ayugranth_auth_token';
const USER_KEY = 'ayugranth_auth_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const [loading, setLoading] = useState(true);

  // Validate session against backend on mount if token exists
  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const verifiedUser = await authApi.getMe();
        if (isMounted && verifiedUser) {
          setUser(verifiedUser);
          localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser));
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err);
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    const accessToken = response.access_token;
    const userData = response.user;

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    setToken(accessToken);
    setUser(userData);
    return response;
  };

  const signup = async (formData) => {
    const response = await authApi.signup(formData);
    const accessToken = response.access_token;
    const userData = response.user;

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    setToken(accessToken);
    setUser(userData);
    return response;
  };

  const logout = () => {
    clearProductsCache();           // wipe cached passport list for this session
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
