import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { tokenStorage } from './tokenStorage';
import { refreshTokens, logoutUser } from './api';
import type { User, DecodedToken } from './types';
import type { TokenPairSchema } from './schemas';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokenPair: TokenPairSchema) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REFRESH_THRESHOLD_MS = 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback(
    (expiresIn: number) => {
      clearRefreshTimeout();

      const refreshTime = expiresIn * 1000 - REFRESH_THRESHOLD_MS;

      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(async () => {
          const currentRefreshToken = tokenStorage.getRefreshToken();
          if (!currentRefreshToken) return;

          try {
            const tokenPair = await refreshTokens(currentRefreshToken);
            tokenStorage.setTokens(tokenPair.access_token, tokenPair.refresh_token, tokenPair.expires_in);
            scheduleTokenRefresh(tokenPair.expires_in);
          } catch {
            // Refresh failed, will be handled by axios interceptor on next request
          }
        }, refreshTime);
      }
    },
    [clearRefreshTimeout]
  );

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();

      if (!accessToken || !refreshToken) {
        setIsLoading(false);
        return;
      }

      if (tokenStorage.isTokenExpired()) {
        try {
          const tokenPair = await refreshTokens(refreshToken);
          tokenStorage.setTokens(tokenPair.access_token, tokenPair.refresh_token, tokenPair.expires_in);

          const decoded = jwtDecode<DecodedToken>(tokenPair.access_token);
          setUser({ sub: decoded.sub, role: decoded.role });
          setIsAuthenticated(true);
          scheduleTokenRefresh(tokenPair.expires_in);
        } catch {
          tokenStorage.clearTokens();
        }
      } else {
        try {
          const decoded = jwtDecode<DecodedToken>(accessToken);
          setUser({ sub: decoded.sub, role: decoded.role });
          setIsAuthenticated(true);

          const expiry = tokenStorage.getTokenExpiry();
          if (expiry) {
            const remainingMs = expiry - Date.now();
            scheduleTokenRefresh(Math.floor(remainingMs / 1000));
          }
        } catch {
          tokenStorage.clearTokens();
        }
      }

      setIsLoading(false);
    };

    initAuth();

    return () => clearRefreshTimeout();
  }, [scheduleTokenRefresh, clearRefreshTimeout]);

  const login = useCallback(
    (tokenPair: TokenPairSchema) => {
      tokenStorage.setTokens(tokenPair.access_token, tokenPair.refresh_token, tokenPair.expires_in);

      const decoded = jwtDecode<DecodedToken>(tokenPair.access_token);
      setUser({ sub: decoded.sub, role: decoded.role });
      setIsAuthenticated(true);
      scheduleTokenRefresh(tokenPair.expires_in);
    },
    [scheduleTokenRefresh]
  );

  const logout = useCallback(async () => {
    clearRefreshTimeout();

    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();

    if (accessToken && refreshToken) {
      try {
        await logoutUser(accessToken, refreshToken);
      } catch {
        // Ignore errors - logout locally regardless
      }
    }

    tokenStorage.clearTokens();
    setUser(null);
    setIsAuthenticated(false);
  }, [clearRefreshTimeout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
