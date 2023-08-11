import {Logger} from 'pino';
import {User} from '../../users/v1';

export {};

declare global {
  namespace Express {
    export interface Request {
      user?: User;
      log: Logger;
    }
  }
}
