import { Request, Response, NextFunction } from 'express';

// Extending Express Request to attach user details
export interface AuthenticatedRequest extends Request {
  user?: {
    name: string;
    role: string;
    permissions: string[];
  };
}

/**
 * Middleware to enforce Role-Based Access Control (RBAC)
 * @param requiredPermission The specific action permission required (e.g., 'Approve Flagged')
 */
export const requirePermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, NextFunction: NextFunction) => {
    // Simulated logged-in user profile (In real app, decoded from a JWT token)
    req.user = {
      name: "Encik Hafiz bin Rashid",
      role: "Senior Officer",
      permissions: ['View Dashboard', 'Manage Tenants', 'Process Payments', 'View Reports', 'Approve Flagged', 'Export Data', 'View Audit Log']
    };

    const userPermissions = req.user?.permissions || [];

    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        error: `Access Denied: Missing required permission [${requiredPermission}]` 
      });
    }

    next();
  };
};