import express from 'express';
import crypto from 'crypto';
import pinoHttp from 'pino-http';
import cors from 'cors';
import {Firestore} from '@google-cloud/firestore';
import {initializeApp} from 'firebase-admin/app';
import * as firebaseAdmin from 'firebase-admin';
import {logger} from './logger';
import {UsersService} from './users';
import {errorHandler} from './error-handler';
import {config} from './config';
import {WantsService} from './wants';
import {AuthService} from './auth';
import {Auth} from './middleware';
import {WantsRouterV1} from './wants/routers';

initializeApp({
  projectId: config.googleCloud.projectId,
});

const firestore = new Firestore({
  projectId: config.googleCloud.projectId,
});

const usersService = new UsersService({
  firestore: {
    client: firestore,
    collections: {
      users: config.users.firestore.collections.users,
    },
  },
});

const wantsService = new WantsService({
  firestore: {
    client: firestore,
    collections: {
      wants: config.wants.firestore.collections.wants,
    },
  },
  usersService,
});

const authService = new AuthService({
  firebaseAuth: firebaseAdmin.auth(),
  logger,
});

const wantsRouterV1 = new WantsRouterV1({
  wantsService,
}).router;

const app = express();

app.use(
  pinoHttp({
    logger,

    genReqId: function (req, res) {
      const existingId = req.id ?? req.headers['x-cloud-trace-context'];

      if (existingId) {
        return existingId;
      }

      // See https://cloud.google.com/trace/docs/setup#force-trace
      const traceId = crypto.randomBytes(16).toString('hex');
      const spanId = crypto.randomInt(1, 281474976710655);
      const id = `${traceId}/${spanId};o=1`;
      res.setHeader('x-cloud-trace-context', id);
      return id;
    },

    serializers: {
      req(req) {
        req.body = req.raw.body;
        return req;
      },
    },
  })
);

app.use(express.json());

app.use(cors());

app.use(
  new Auth({
    authService,
    usersService,
  }).requireAuth
);

app.use('/v1/wants', wantsRouterV1);

app.use(
  async (
    err: Error,
    req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    await errorHandler.handleError(err, req, res);
  }
);

export {app};