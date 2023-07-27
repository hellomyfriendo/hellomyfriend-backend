import express from 'express';
import crypto from 'crypto';
import pinoHttp from 'pino-http';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import {Firestore} from '@google-cloud/firestore';
import {Storage} from '@google-cloud/storage';
import {Client} from '@googlemaps/google-maps-services-js';
import {initializeApp} from 'firebase-admin/app';
import * as firebaseAdmin from 'firebase-admin';
import {AuthService} from './auth';
import {FriendsService} from './friends';
import {UsersService} from './users';
import {WantsRouterV1, WantsService} from './wants';
import {Auth} from './middleware';
import {logger} from './logger';
import {errorHandler} from './error-handler';
import {config} from './config';
import {HealthCheckRouter} from './health-check';

initializeApp({
  projectId: config.google.projectId,
});

const firestore = new Firestore({
  projectId: config.google.projectId,
});

const storage = new Storage({
  projectId: config.google.projectId,
});

const googleMapsServicesClient = new Client({});

const usersService = new UsersService({
  firestore: {
    client: firestore,
    collections: {
      users: config.users.firestore.collections.users,
    },
  },
});

const friendsService = new FriendsService({
  firestore: {
    client: firestore,
    collections: {
      friendRequests: config.friends.firestore.collections.friendRequests,
      follows: config.friends.firestore.collections.follows,
    },
  },
  usersService,
});

const wantsService = new WantsService({
  firestore: {
    client: firestore,
    collections: {
      wants: config.wants.firestore.collections.wants,
    },
  },
  storage: {
    client: storage,
    buckets: {
      wantsAssets: config.wants.storage.buckets.wantsAssets,
    },
  },
  googleMapsServicesClient,
  googleApiKey: config.google.apiKey,
  friendsService,
  usersService,
});

const authService = new AuthService({
  firebaseAuth: firebaseAdmin.auth(),
  logger,
});

const healthCheckRouter = new HealthCheckRouter().router;

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

app.use(cors());

app.use(express.json());

app.use(fileUpload());

app.use(
  new Auth({
    authService,
    usersService,
  }).requireAuth
);

app.use('/', healthCheckRouter);

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
