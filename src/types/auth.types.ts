export interface Admin {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminLoginDTO {
  email: string;
  password: string;
}

export interface AdminRegisterDTO {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface AdminPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  admin: Omit<Admin, 'password'>;
  token: string;
}
