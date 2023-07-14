import {Logger} from 'pino';
import {User} from '../../users';

export {};

declare global {
  namespace Express {
    export interface Request {
      user?: User;
      log: Logger;
    }
  }
}
