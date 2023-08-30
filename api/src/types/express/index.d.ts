import {Logger} from 'pino';
import {AuthUser} from '../../auth/v1';

export {};

declare global {
  namespace Express {
    export interface Request {
      user?: AuthUser;
      log: Logger;
    }
  }
}
