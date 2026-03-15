import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/supabase';
import { Admin, AdminLoginDTO, AdminRegisterDTO, AuthResponse, AdminPayload } from '../../types/auth.types';
import { AppError } from '../../middlewares/error-handler';

const TABLE = 'admins';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Register a new admin
   */
  async register(dto: AdminRegisterDTO): Promise<AuthResponse> {
    // Check if email already exists
    const { data: existing } = await supabase
      .from(TABLE)
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existing) {
      throw new AppError('Email sudah terdaftar', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role || 'admin',
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    const admin = data as Admin;
    const token = this.generateToken(admin);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...adminWithoutPassword } = admin;

    return { admin: adminWithoutPassword, token };
  }

  /**
   * Login admin
   */
  async login(dto: AdminLoginDTO): Promise<AuthResponse> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('email', dto.email)
      .single();

    if (error || !data) {
      throw new AppError('Email atau password salah', 401);
    }

    const admin = data as Admin;

    if (!admin.is_active) {
      throw new AppError('Akun telah dinonaktifkan', 403);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(dto.password, admin.password);

    if (!isValidPassword) {
      throw new AppError('Email atau password salah', 401);
    }

    // Update last login
    await supabase
      .from(TABLE)
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    const token = this.generateToken(admin);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...adminWithoutPassword } = admin;

    return { admin: adminWithoutPassword, token };
  }

  /**
   * Get current admin profile
   */
  async getProfile(adminId: string): Promise<Omit<Admin, 'password'>> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, email, role, is_active, last_login_at, created_at, updated_at')
      .eq('id', adminId)
      .single();

    if (error || !data) {
      throw new AppError('Admin tidak ditemukan', 404);
    }

    return data as Omit<Admin, 'password'>;
  }

  /**
   * Generate JWT token
   */
  private generateToken(admin: Admin): string {
    const payload: AdminPayload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }
}

export const authService = new AuthService();
