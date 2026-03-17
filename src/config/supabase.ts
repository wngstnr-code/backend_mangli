import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.error("Gagal terhubung ke Supabase:", error.message);
      return false;
    }
    console.log("Supabase berhasil terhubung");
    return true;
  } catch (err: any) {
    console.error("Gagal terhubung ke Supabase:", err.message);
    return false;
  }
};

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey,);
