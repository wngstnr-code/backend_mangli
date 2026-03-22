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

export interface UpdateProfileDTO {
  name?: string;
  password?: string;
  current_password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  otp: string;
  new_password: string;
}
