import { UserRole } from 'generated/prisma';

/**
 * JWT Payload Data Transfer Object
 * 
 * Represents the structure of data encoded in JWT tokens.
 * This payload is extracted from validated JWT tokens and attached to
 * the request object as `request.user` after successful authentication.
 * 
 * The 'sub' field contains the user ID (subject of the token).
 */
export class PayloadDTO {
  /**
   * User's email address
   */
  email: string;

  /**
   * User ID (subject)
   * The unique identifier of the user
   */
  sub: number;

  /**
   * User's role
   * Determines permissions and access level
   */
  role: UserRole;
}
