export type UserRole = 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP' | 'VIEWER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthTenant {
  id: string;
  companyName: string;
  subdomain: string;
  logoDataUri: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
}

/** Response of /auth/login and /auth/signup. */
export interface AuthResult extends AuthTokens {
  user: AuthUser;
  tenant: AuthTenant;
}

export interface LoginRequest {
  subdomain: string;
  email: string;
  password: string;
}

export interface SignupRequest {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  subdomain: string;
  adminName: string;
  adminEmail: string;
  password: string;
  logo: string;
}
