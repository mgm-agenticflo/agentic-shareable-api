import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/lib';
import { ShareableContext } from '../types/shareable-context';

export const CreateTransientTokenService = (secret: string) => ({
  verify: (token: string, options?: jwt.VerifyOptions): ShareableContext => {
    try {
      const decoded = jwt.verify(token, secret, options) as ShareableContext;
      return decoded;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      logger.error(msg, err);
      throw new Error('Invalid or expired token');
    }
  },

  generate: (payload: ShareableContext, expiresIn: string = '10m'): string => {
    return jwt.sign(payload, secret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
  }
});

export type TransientTokenService = ReturnType<typeof CreateTransientTokenService>;
export const tokenService = CreateTransientTokenService(process.env.CLIENT_AUTH_SECRET || String(Math.random()));
