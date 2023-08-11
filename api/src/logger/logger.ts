import {pino} from 'pino';
import {getPinoOptions} from '@relaycorp/pino-cloud';
import {config} from '../config';

const logger = pino({
  ...getPinoOptions('gcp', {
    name: config.google.cloudRun.service,
    version: config.google.cloudRun.revision,
  }),
  level: config.logLevel,
  redact: [
    'req.headers.Authorization',
    'req.headers.authorization',
    'req.headers["x-goog-iap-jwt-assertion"]',
    'req.headers["x-serverless-authorization"]',
    'req.body.password',
  ],
});

export {logger};
