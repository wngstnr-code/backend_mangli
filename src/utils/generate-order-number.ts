/**
 * Generate unique order number.
 * Format: MGL-YYYYMMDD-XXXXXX (random 6 char alphanumeric uppercase)
 * Contoh: MGL-20260315-A3B7K2
 */
export const generateOrderNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `MGL-${year}${month}${day}-${randomPart}`;
};
