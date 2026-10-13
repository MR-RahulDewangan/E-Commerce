import { Role } from '@prisma/client';
import { getSessionUserFromRequest, SessionUser } from './session';
import { AuthError } from './service';

/**
 * Asserts that the current request has an active, valid session.
 * Throws 401 UNAUTHORIZED if the session is missing or expired.
 */
export async function requireAuthenticatedUser(req: Request): Promise<SessionUser> {
  const user = await getSessionUserFromRequest(req);
  if (!user) {
    throw new AuthError('Authentication session is required.', 'UNAUTHORIZED', 401);
  }
  return user;
}

/**
 * Asserts that the authenticated user possesses one of the allowed roles.
 * Throws 401 UNAUTHORIZED if not authenticated, or 403 FORBIDDEN if the role is insufficient.
 */
export async function requireRole(
  allowedRoles: Role | Role[],
  req: Request
): Promise<SessionUser> {
  const user = await requireAuthenticatedUser(req);
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    throw new AuthError(
      `Forbidden: Required role (${roles.join(' or ')}) not granted to role '${user.role}'.`,
      'FORBIDDEN',
      403
    );
  }

  return user;
}

/**
 * Convenience guard asserting that the authenticated user possesses the ADMIN role.
 */
export async function requireAdmin(req: Request): Promise<SessionUser> {
  return requireRole('ADMIN', req);
}

/**
 * Convenience guard asserting that the authenticated user possesses either ADMIN or FULFILLMENT role.
 */
export async function requireAdminOrFulfillment(req: Request): Promise<SessionUser> {
  return requireRole([Role.ADMIN, Role.FULFILLMENT], req);
}
