import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../../config/supabase';
import { Admin, AdminLoginDTO, AdminRegisterDTO, AuthResponse, AdminPayload, UpdateProfileDTO, ForgotPasswordDTO, ResetPasswordDTO } from '../../types/auth.types';
import { AppError } from '../../middlewares/error-handler';
import { transporter, SMTP_FROM } from '../../config/mailer';

const TABLE = 'admins';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

export class AuthService {
  async register(dto: AdminRegisterDTO): Promise<AuthResponse> {
    const { data: existing } = await supabase
      .from(TABLE)
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existing) {
      throw new AppError('Email sudah terdaftar', 409);
    }

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

    const { password: _, ...adminWithoutPassword } = admin;

    return { admin: adminWithoutPassword, token };
  }

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

    const isValidPassword = await bcrypt.compare(dto.password, admin.password);

    if (!isValidPassword) {
      throw new AppError('Email atau password salah', 401);
    }

    await supabase
      .from(TABLE)
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    const token = this.generateToken(admin);

    const { password: _, ...adminWithoutPassword } = admin;

    return { admin: adminWithoutPassword, token };
  }

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

  private generateToken(admin: Admin): string {
    const payload: AdminPayload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  async updateProfile(adminId: string, dto: UpdateProfileDTO): Promise<Omit<Admin, 'password'>> {
    const { data: admin, error: fetchError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', adminId)
      .single();

    if (fetchError || !admin) throw new AppError('Admin tidak ditemukan', 404);

    const isValid = await bcrypt.compare(dto.current_password, admin.password);
    if (!isValid) throw new AppError('Password saat ini salah', 401);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name) updateData.name = dto.name;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const { data, error } = await supabase
      .from(TABLE)
      .update(updateData)
      .eq('id', adminId)
      .select('id, name, email, role, is_active, last_login_at, created_at, updated_at')
      .single();

    if (error) throw new AppError(error.message, 500);

    return data as Omit<Admin, 'password'>;
  }

  async forgotPassword(dto: ForgotPasswordDTO): Promise<{ message: string }> {
    const { data: admin } = await supabase
      .from(TABLE)
      .select('id, email, name')
      .eq('email', dto.email)
      .single();

    if (!admin) {
      return { message: 'Jika email terdaftar, link reset password telah dikirim.' };
    }
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString(); 
    const resetTokenExpires = new Date();
    resetTokenExpires.setMinutes(resetTokenExpires.getMinutes() + 15); 

    await supabase
      .from(TABLE)
      .update({
        reset_token: resetToken,
        reset_token_expires: resetTokenExpires.toISOString(),
      })
      .eq('id', admin.id);

    await transporter.sendMail({
      from: SMTP_FROM,
      to: admin.email,
      subject: 'Reset Password - KAWAN Mangli',
      html: `
        <h2>Reset Password</h2>
        <p>Halo ${admin.name},</p>
        <p>Anda menerima email ini karena ada permintaan reset password untuk akun Anda.</p>
        <p>Gunakan kode OTP berikut untuk mereset password Anda:</p>
        <p style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 15px; border-radius: 5px; letter-spacing: 5px; text-align: center;">${resetToken}</p>
        <p>Kode OTP ini berlaku selama 15 menit.</p>
        <p>Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
      `,
    });

    return { message: 'Jika email terdaftar, link reset password telah dikirim.' };
  }

  async resetPassword(dto: ResetPasswordDTO): Promise<{ message: string }> {
    const { data: admin, error } = await supabase
      .from(TABLE)
      .select('id, reset_token, reset_token_expires')
      .eq('reset_token', dto.otp)
      .single();

    if (error || !admin) throw new AppError('Kode OTP tidak valid', 400);

    if (new Date(admin.reset_token_expires) < new Date()) {
      throw new AppError('Kode OTP sudah kedaluwarsa', 400);
    }

    const hashedPassword = await bcrypt.hash(dto.new_password, SALT_ROUNDS);

    await supabase
      .from(TABLE)
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', admin.id);

    return { message: 'Password berhasil direset. Silakan login dengan password baru.' };
  }
}

export const authService = new AuthService();
