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
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1B515E, #2D7A8B); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; color: #FBCB35 !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">RESET PASSWORD</h1>
      <p style="margin: 8px 0 0 0; font-size: 15px; font-weight: bold; opacity: 0.9; color: #ffffff !important;">Kawasan Agroeduwisata Mangli</p>
    </div>

    <!-- Body -->
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">Halo <strong>${admin.name}</strong>,</p>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
        Anda menerima email ini karena ada permintaan reset password untuk akun admin Anda. Silakan gunakan kode OTP di bawah ini untuk melanjutkan proses pemulihan akun.
      </p>

      <div style="background: #f1f5f9; padding: 24px; border-radius: 8px; text-align: center; border-left: 4px solid #FBCB35; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">KODE OTP ANDA</p>
        <p style="margin: 0; font-size: 36px; font-weight: bold; color: #1B515E; letter-spacing: 8px;">${resetToken}</p>
      </div>

      <p style="margin: 0 0 16px 0; font-size: 14px; color: #dc2626;">
        <strong>Penting:</strong> Kode OTP ini hanya berlaku selama <strong>15 menit</strong>. Jangan bagikan kode ini kepada siapa pun!
      </p>

      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
        Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan pesan ini. Akun Anda tetap aman.
      </p>

      <!-- Footer -->
      <div style="margin-top: 32px; padding: 20px; background: linear-gradient(135deg, #1B515E, #2D7A8B); border-radius: 8px; text-align: center; border-bottom: 4px solid #FBCB35;">
        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #FBCB35;">Kawasan Agroeduwisata Mangli</p>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #ffffff; letter-spacing: 0.5px; opacity: 0.9;">System Administration Management</p>
      </div>
    </div>
  </div>
</body>
</html>
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
