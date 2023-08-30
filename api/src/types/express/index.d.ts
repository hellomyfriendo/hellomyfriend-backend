import {Logger} from 'pino';

export {};

declare global {
  namespace Express {
    export interface Request {
      userId: string;
      log: Logger;
    }
  }
}
