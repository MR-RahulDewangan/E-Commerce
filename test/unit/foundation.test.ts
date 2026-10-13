import { describe, it, expect } from 'vitest';

describe('Project Foundation Setup', () => {
  it('loads environment variables or default fallbacks correctly', () => {
    const paymentProvider = process.env.PAYMENT_PROVIDER || 'MOCK';
    expect(['MOCK', 'RAZORPAY']).toContain(paymentProvider);
  });

  it('validates currency standard is INR and amount calculations use paise', () => {
    const toPaise = (rupees: number) => Math.round(rupees * 100);
    const toRupees = (paise: number) => (paise / 100).toFixed(2);

    expect(toPaise(1499.00)).toBe(149900);
    expect(toRupees(149900)).toBe('1499.00');
  });

  it('verifies 18% inclusive GST calculation formula', () => {
    // Total price (MRP) is ₹1,499.00 = 149900 paise
    const totalPaise = 149900;
    // Base = Total / 1.18
    const basePaise = Math.round(totalPaise / 1.18);
    const gstPaise = totalPaise - basePaise;
    const cgstPaise = Math.round(gstPaise / 2);
    const sgstPaise = gstPaise - cgstPaise;

    expect(basePaise + gstPaise).toBe(totalPaise);
    expect(cgstPaise + sgstPaise).toBe(gstPaise);
    expect(basePaise).toBe(127034); // ₹1,270.34
    expect(gstPaise).toBe(22866);   // ₹228.66
  });
});
