// Roles and Permissions
export interface Permission {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Array of permission names
  assignedCount: number;
  color: string;
}

// Flagged Payments (UC20 / AIDID Integration)
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

// Audit Logs
export interface AuditLog {
  id: string;      // Matches the related Flagged Payment ID
  action: string;  // e.g., 'Approve', 'Reject', 'Request Tenant Update'
  by: string;      // Staff Name or Staff ID
  at: string;      // Timestamp
}