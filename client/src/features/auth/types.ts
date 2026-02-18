export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface DecodedToken {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

export interface User {
  sub: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
