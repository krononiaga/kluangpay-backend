import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from a .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ───────────────────────────────────────────────────────────────────────────
// 📊 DATA INTERFACES & SCHEMAS
// ───────────────────────────────────────────────────────────────────────────

export interface User {
  phone: string;
  name: string;
  password?: string;
  type: 'tenant' | 'admin';
  permissions?: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  assignedCount: number;
  color: string;
}

export interface FlaggedPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  paymentMethod: string;
  errorType: 'Mismatch' | 'Timeout' | 'Duplicate';
  errorDescription: string;
  status: 'Pending' | 'Validated' | 'Invalid' | 'Approved' | 'Rejected' | 'UpdateRequested';
  flaggedAt: string;
  staffNote?: string;
  staffActionAt?: string;
  invoiceIds: number[];
}

export interface AuditLog {
  id: string;
  action: string;
  by: string;
  at: string;
}

// ───────────────────────────────────────────────────────────────────────────
// 🗄️ IN-MEMORY DATABASE (SEED DATA)
// ───────────────────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = ['View Dashboard', 'Manage Tenants', 'Manage Officers', 'Process Payments', 'View Reports', 'Approve Flagged', 'Manage Roles', 'Export Data', 'View Audit Log', 'Send Notifications'];

// Temporary operational memory stores
const otpStore = new Map<string, { otp: string; expires: number; userData?: any }>();
const auditLogsTable: AuditLog[] = [];

// Seed users containing both a default tenant and an authorized admin staff officer
const userDatabase: User[] = [
  { phone: '0123456789', name: 'Ahmad bin Abdullah', password: 'KP-982aB', type: 'tenant' },
  { 
    phone: '0191234567', 
    name: 'Encik Hafiz bin Rashid', 
    password: 'STF-secure123', 
    type: 'admin',
    permissions: ['View Dashboard', 'Manage Tenants', 'Process Payments', 'View Reports', 'Approve Flagged', 'Export Data', 'View Audit Log']
  }
];

let rolesTable: Role[] = [
  { id: 'ROLE-001', name: 'Super Admin', description: 'Full system access with all permissions', permissions: ALL_PERMISSIONS, assignedCount: 1, color: 'bg-red-100 text-red-800' },
  { id: 'ROLE-002', name: 'Senior Officer', description: 'Manage tenants, approve payments and view analytics', permissions: ['View Dashboard', 'Manage Tenants', 'Process Payments', 'View Reports', 'Approve Flagged', 'Export Data', 'View Audit Log'], assignedCount: 2, color: 'bg-[#e8eeff] text-[#162b9e]' },
  { id: 'ROLE-003', name: 'Finance Officer', description: 'Handle payments, settlements and financial reports', permissions: ['View Dashboard', 'Process Payments', 'View Reports', 'Approve Flagged', 'Export Data'], assignedCount: 3, color: 'bg-green-100 text-green-800' }
];

let flaggedPaymentsTable: FlaggedPayment[] = [
  {
    id: 'FLG-9021',
    tenantId: '123456-78-9012',
    tenantName: 'Ahmad bin Abdullah',
    amount: 1200.00,
    paymentMethod: 'FPX',
    errorType: 'Mismatch',
    errorDescription: 'Payment token amount does not match original municipal invoice billing.',
    status: 'Pending',
    flaggedAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    invoiceIds: [101, 102]
  }
];

// ───────────────────────────────────────────────────────────────────────────
// 🤖 AUTOMATED WHATSAPP GATEWAY SERVICE
// ───────────────────────────────────────────────────────────────────────────
async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  // Simulates automated background scripts sending logs/credentials to mobile phone networks.
  // In your production build, replace this with an axios call to Twilio, Vonage, or WATI.
  console.log(`\n📱 [WHATSAPP OUTBOX] Sending to: ${phoneNumber}`);
  console.log(`💬 Message: "${message}"\n`);
  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// 🛡️ SECURITY MIDDLEWARE (ROLE-BASED ACCESS CONTROL)
// ───────────────────────────────────────────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  user?: { name: string; role: string; permissions: string[]; phone: string };
}

const requirePermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Simulated token auth: Extracts staff member profile using request context headers
    const authPhone = (req.headers['x-auth-phone'] as string) || '0191234567';
    const systemUser = userDatabase.find(u => u.phone === authPhone && u.type === 'admin');

    if (!systemUser) {
      return res.status(401).json({ error: 'Unauthorized operational staff access.' });
    }

    const userPermissions = systemUser.permissions || [];
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ error: `Access Denied: Missing required permission [${requiredPermission}]` });
    }

    req.user = { name: systemUser.name, role: 'Staff', permissions: userPermissions, phone: systemUser.phone };
    next();
  };
};

// ───────────────────────────────────────────────────────────────────────────
// 📱 MODULE A: TENANT AUTHENTICATION & WHATSAPP GENERATOR
// ───────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Accept tenant details and trigger an automated 6-digit WhatsApp OTP
 */
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, address, phone } = req.body;
  if (!name || !address || !phone) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  otpStore.set(phone, { otp: generatedOtp, expires, userData: { name, address, phone } });

  const message = `[KluangPay] Your registration OTP code is ${generatedOtp}. This code is valid for 5 minutes. Do not share it with anyone.`;
  await sendWhatsAppMessage(phone, message);

  res.status(200).json({ success: true, message: 'OTP code has been successfully sent via WhatsApp.' });
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Validate OTP input and trigger system scripts to auto-generate password to WhatsApp
 */
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  const record = otpStore.get(phone);

  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ error: 'Invalid or expired OTP code.' });
  }

  // AI-system automated secure password logic assignment 
  const randomString = Math.random().toString(36).substring(2, 7); 
  const generatedPassword = `KP-${randomString}`; // e.g., KP-x9f2a

  userDatabase.push({
    phone: record.userData.phone,
    name: record.userData.name,
    password: generatedPassword,
    type: 'tenant'
  });

  otpStore.delete(phone);

  const successMessage = `🎉 Congratulations! Your KluangPay registration has been APPROVED.\n\nName: ${record.userData.name}\nLogin ID (Phone): ${phone}\nPassword: ${generatedPassword}\n\nPlease keep this password secure to access your portal.`;
  await sendWhatsAppMessage(phone, successMessage);

  res.status(200).json({ success: true, message: 'Phone number verified. Credentials have been dispatched.' });
});

/**
 * @route   POST /api/auth/login
 * @desc    Unified login processing portal matching users by credentials
 */
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { phone, password } = req.body;
  const user = userDatabase.find(u => u.phone === phone);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid phone number or password.' });
  }

  res.status(200).json({
    success: true,
    user: { name: user.name, type: user.type, phone: user.phone }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 🏢 MODULE B: ADMINISTRATIVE BACKEND SERVICES (LUTFI'S ASSIGNED REPO COMPONENT)
// ───────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/admin/roles
 * @desc    Fetch all defined administrative access configuration roles
 */
app.get('/api/admin/roles', requirePermission('View Dashboard'), (req: Request, res: Response) => {
  res.status(200).json(rolesTable);
});

/**
 * @route   POST /api/admin/roles
 * @desc    Provision a brand new organizational permission level grouping
 */
app.post('/api/admin/roles', requirePermission('Manage Roles'), (req: Request, res: Response) => {
  const { name, description, permissions } = req.body;
  if (!name || !permissions || permissions.length === 0) {
    return res.status(400).json({ error: 'Role name and at least one permission are required.' });
  }

  const newRole: Role = {
    id: `ROLE-${String(rolesTable.length + 1).padStart(3, '0')}`,
    name,
    description: description || '',
    permissions,
    assignedCount: 0,
    color: 'bg-teal-100 text-teal-800'
  };

  rolesTable.push(newRole);
  res.status(201).json({ success: true, role: newRole });
});

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Expose background activity ledger tracking staff operational changes
 */
app.get('/api/admin/audit-logs', requirePermission('View Audit Log'), (req: Request, res: Response) => {
  res.status(200).json(auditLogsTable);
});

/**
 * @route   GET /api/admin/payments/flagged
 * @desc    Pull automated anomalies intercepted by the background AIDID compliance checker
 */
app.get('/api/admin/payments/flagged', requirePermission('View Dashboard'), (req: Request, res: Response) => {
  res.status(200).json(flaggedPaymentsTable);
});

/**
 * @route   PATCH /api/admin/payments/flagged/:id
 * @desc    Process human remediation actions (Approve, Reject, Request Update) and fire audit signals
 */
app.patch('/api/admin/payments/flagged/:id', requirePermission('Approve Flagged'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, staffNote } = req.body;

  const paymentIndex = flaggedPaymentsTable.findIndex(p => p.id === id);
  if (paymentIndex === -1) {
    return res.status(404).json({ error: 'Flagged payment entity not found.' });
  }

  const timestamp = new Date().toISOString();
  const staffName = req.user?.name || "Unknown Officer";

  // Align UI descriptors with semantic data indexing terms
  let logActionLabel = status;
  if (status === 'UpdateRequested') logActionLabel = 'Request Tenant Update';
  if (status === 'Approved') logActionLabel = 'Approve';
  if (status === 'Rejected') logActionLabel = 'Reject';

  // Apply state modification mutations
  flaggedPaymentsTable[paymentIndex] = {
    ...flaggedPaymentsTable[paymentIndex],
    status,
    staffNote,
    staffActionAt: timestamp
  };

  // Automated log entry tracking to verify execution steps
  auditLogsTable.unshift({ id, action: logActionLabel, by: staffName, at: timestamp });

  res.status(200).json({ 
    success: true, 
    message: `Payment status shifted to [${status}]. Logged inside core audit framework.`,
    updatedPayment: flaggedPaymentsTable[paymentIndex]
  });
});

app.listen(PORT, () => console.log(`🚀 Unified KluangPay Engine running on http://localhost:${PORT}`));