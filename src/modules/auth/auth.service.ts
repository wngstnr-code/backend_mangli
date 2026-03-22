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
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - KAWAN Mangli</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="width: 100%; table-layout: fixed; background-color: #f1f5f9; padding-bottom: 40px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
      
      <!-- Brand Header -->
      <div style="background-color: #1b515e; background-image: linear-gradient(135deg, #1b515e 0%, #2a7a8b 100%); padding: 40px 20px; text-align: center;">
        <div style="display: inline-block; padding: 8px 16px; background-color: rgba(255, 255, 255, 0.1); border-radius: 8px; margin-bottom: 16px;">
          <span style="color: #fbcb35; font-weight: 800; font-size: 14px; letter-spacing: 3px; text-transform: uppercase;">KAWAN MANGLI</span>
        </div>
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Pemulihan Kata Sandi</h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px 32px;">
        <p style="margin: 0 0 16px; font-size: 18px; color: #1e293b; font-weight: 600;">Halo, ${admin.name}!</p>
        <p style="margin: 0 0 32px; font-size: 16px; color: #475569; line-height: 1.6;">
          Kami menerima permintaan untuk menyetel ulang kata sandi akun Admin Anda. Jangan khawatir, kami akan membantu Anda kembali masuk dengan aman.
        </p>

        <!-- OTP Box -->
        <div style="background-color: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 32px 20px; text-align: center; margin-bottom: 32px;">
          <p style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 2px;">KODE VERIFIKASI ANDA</p>
          <div style="display: inline-block; background-color: #ffffff; padding: 16px 32px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; color: #1b515e; letter-spacing: 12px; margin-left: 12px;">${resetToken}</span>
          </div>
          <p style="margin: 20px 0 0; font-size: 14px; color: #64748b;">
            Berlaku hingga <span style="color: #1b515e; font-weight: 600;">15 menit</span> ke depan
          </p>
        </div>

        <!-- Security Notice -->
        <div style="background-color: #fffbeb; border-radius: 8px; padding: 16px; margin-bottom: 32px; border-left: 4px solid #fbcb35;">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: top; padding-right: 12px;">
                <span style="font-size: 20px;">⚠️</span>
              </td>
              <td>
                <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
                  <strong>Rahasiakan kode ini.</strong> Staf Kawasan Mangli tidak akan pernah meminta kode OTP Anda melalui Telepon, Email, atau WhatsApp.
                </p>
              </td>
            </tr>
          </table>
        </div>

        <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
          Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini dengan aman. Tombol reset akan kedaluwarsa secara otomatis.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 32px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: 600;">Sistem Admin Otomatis</p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; 2026 Kawasan Agroeduwisata Mangli. All rights reserved.</p>
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
