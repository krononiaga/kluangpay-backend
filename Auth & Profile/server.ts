import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from a .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

/**
 * 🗄️ In-Memory Data Store
 * Replace these with a persistent database (e.g., MySQL, PostgreSQL, or MongoDB) in production.
 */
const otpStore = new Map<string, { otp: string; expires: number; userData?: any }>();
const userDatabase = [
  { phone: '0123456789', name: 'Ahmad bin Abdullah', password: 'KP-982aB', type: 'tenant' }
];

/**
 * 🤖 Automated WhatsApp Gateway Integration Service
 * In a production environment, replace the console logs with a real HTTP request 
 * using axios/fetch to services like Twilio, Vonage, or WATI.
 */
async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  console.log(`\n📱 [WHATSAPP OUTBOX] Sending to: ${phoneNumber}`);
  console.log(`💬 Message: "${message}"\n`);
  return true;
}

/**
 * ───────────────────────────────────────────────────────────────────────────
 * FLOW 1: TENANT REGISTRATION
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * @route   POST /api/auth/register
 * @desc    Accept registration details and send a 6-digit OTP via WhatsApp
 */
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, address, phone } = req.body;

  if (!name || !address || !phone) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  // Generate a cryptographically secure-like 6-digit random OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes

  // Store the OTP and user metadata temporarily
  otpStore.set(phone, { otp: generatedOtp, expires, userData: { name, address, phone } });

  // Construct and send the WhatsApp verification message
  const message = `[KluangPay] Your registration OTP code is ${generatedOtp}. This code is valid for 5 minutes. Do not share it with anyone.`;
  await sendWhatsAppMessage(phone, message);

  res.status(200).json({ success: true, message: 'OTP code has been successfully sent via WhatsApp.' });
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify the submitted OTP and automatically provision credentials via AI/System
 */
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  const record = otpStore.get(phone);

  // Validate OTP existence, match, and expiration status
  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ error: 'Invalid or expired OTP code.' });
  }

  /**
   * 🤖 AUTOMATED CREDENTIAL PROVISIONING
   * Generates a secure, temporary system password for the tenant.
   * In a complex app, this might trigger a 'Pending Approval' status for the staff instead.
   */
  const randomString = Math.random().toString(36).substring(2, 7); 
  const generatedPassword = `KP-${randomString}`; // Example output: KP-x9f2a

  // Commit the new user record to the database
  userDatabase.push({
    phone: record.userData.phone,
    name: record.userData.name,
    password: generatedPassword,
    type: 'tenant'
  });

  // Clear the used OTP from temporary storage
  otpStore.delete(phone);

  // Dispatch the account credentials to the tenant's phone
  const successMessage = `🎉 Congratulations! Your KluangPay registration has been APPROVED.\n\nName: ${record.userData.name}\nLogin ID (Phone): ${phone}\nPassword: ${generatedPassword}\n\nPlease keep this password secure to access your portal.`;
  await sendWhatsAppMessage(phone, successMessage);

  res.status(200).json({ success: true, message: 'Phone number verified. Credentials have been dispatched.' });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 * FLOW 2: USER AUTHENTICATION (LOGIN)
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate users using phone number and password
 */
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { phone, password } = req.body;

  // Query database for the user record by phone number
  const user = userDatabase.find(u => u.phone === phone);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid phone number or password.' });
  }

  // Authentication successful, respond with user profile
  res.status(200).json({
    success: true,
    user: {
      name: user.name,
      type: user.type,
      phone: user.phone
    }
  });
});

app.listen(PORT, () => console.log(`🚀 KluangPay Backend is live and running on http://localhost:${PORT}`));