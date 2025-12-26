import jwt from 'jsonwebtoken';
import { ShareableContext } from '../types/shareable-context';
export declare const CreateTransientTokenService: (secret: string, defaultTransientTTL: string) => {
    /**
     * Verifies and decodes a JWT token.
     *
     * @param token - JWT token string to verify
     * @param options - Optional JWT verification options (e.g., audience, issuer)
     * @returns Decoded ShareableContext from the token payload
     * @throws Error with message 'Invalid or expired token' if verification fails for any reason
     *
     * @example
     * ```typescript
     * try {
     *   const context = tokenService.verify(tokenString);
     *   console.log('User ID:', context.userId);
     * } catch (error) {
     *   console.error('Token verification failed');
     * }
     * ```
     */
    verify: (token: string, options?: jwt.VerifyOptions) => ShareableContext | null;
    /**
     * Generates a signed JWT token containing the provided payload.
     *
     * @param payload - ShareableContext data to encode in the token
     * @param expiresIn - Token expiration time as a string (e.g., '10m', '1h', '7d'). Defaults to '10m'
     * @returns Signed JWT token string
     *
     * @example
     * ```typescript
     * // Generate a token that expires in 10 minutes (default)
     * const shortToken = tokenService.generate({ userId: '123', role: 'user' });
     *
     * // Generate a token that expires in 1 hour
     * const longToken = tokenService.generate({ userId: '123', role: 'admin' }, '1h');
     * ```
     */
    generate: (payload: ShareableContext, expiresIn?: string) => string;
};
export type TransientTokenService = ReturnType<typeof CreateTransientTokenService>;
export declare const tokenService: {
    /**
     * Verifies and decodes a JWT token.
     *
     * @param token - JWT token string to verify
     * @param options - Optional JWT verification options (e.g., audience, issuer)
     * @returns Decoded ShareableContext from the token payload
     * @throws Error with message 'Invalid or expired token' if verification fails for any reason
     *
     * @example
     * ```typescript
     * try {
     *   const context = tokenService.verify(tokenString);
     *   console.log('User ID:', context.userId);
     * } catch (error) {
     *   console.error('Token verification failed');
     * }
     * ```
     */
    verify: (token: string, options?: jwt.VerifyOptions) => ShareableContext | null;
    /**
     * Generates a signed JWT token containing the provided payload.
     *
     * @param payload - ShareableContext data to encode in the token
     * @param expiresIn - Token expiration time as a string (e.g., '10m', '1h', '7d'). Defaults to '10m'
     * @returns Signed JWT token string
     *
     * @example
     * ```typescript
     * // Generate a token that expires in 10 minutes (default)
     * const shortToken = tokenService.generate({ userId: '123', role: 'user' });
     *
     * // Generate a token that expires in 1 hour
     * const longToken = tokenService.generate({ userId: '123', role: 'admin' }, '1h');
     * ```
     */
    generate: (payload: ShareableContext, expiresIn?: string) => string;
};
//# sourceMappingURL=transient-token.d.ts.map