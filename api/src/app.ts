import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import pinoHttp from 'pino-http';
import helmet from 'helmet';
import fileUpload from 'express-fileupload';
import postgres from 'postgres';
import * as firebaseAdmin from 'firebase-admin';
import {LanguageServiceClient} from '@google-cloud/language';
import {Storage} from '@google-cloud/storage';
import {ImageAnnotatorClient} from '@google-cloud/vision';
import {Client} from '@googlemaps/google-maps-services-js';
import {HealthCheckRouter} from './health-check';
import {UsersService} from './users';
import {
  FriendsRouter,
  FriendsService,
  FriendRequestsService,
  FriendRequestsRouter,
} from './friends';
import {WantsRouter, WantsService} from './wants';
import {Auth} from './middleware';
import {errorHandler} from './error-handler';
import {logger} from './logger';
import {config} from './config';

const sql = postgres({
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.name,
  transform: {
    ...postgres.camel,
    undefined: null,
  },
});

firebaseAdmin.initializeApp({
  projectId: config.google.projectId,
});

const firebaseAdminAuth = firebaseAdmin.auth();

const languageServiceClient = new LanguageServiceClient({
  projectId: config.google.projectId,
});

const storage = new Storage({
  projectId: config.google.projectId,
});

const imageAnnotatorClient = new ImageAnnotatorClient({
  projectId: config.google.projectId,
});

const googleMapsServicesClient = new Client({});

const usersService = new UsersService({
  sql,
});

const friendsService = new FriendsService({
  sql,
  usersService,
});

const friendRequestsService = new FriendRequestsService({
  sql,
  friendsService,
  usersService,
});

// const wantsService = new WantsService({
//   firestore: {
//     client: firestore,
//     collections: {
//       wants: config.wants.firestore.collections.wants,
//     },
//   },
//   language: {
//     client: languageServiceClient,
//   },
//   storage: {
//     client: storage,
//     buckets: {
//       wantsAssets: config.wants.storage.buckets.wantsAssets,
//     },
//   },
//   vision: {
//     imageAnnotatorClient,
//   },
//   googleMapsServicesClient,
//   googleApiKey: config.google.apiKey,
//   friendsService: friendsService,
//   usersService: usersService,
// });

const healthCheckRouter = new HealthCheckRouter().router;

const friendsRouter = new FriendsRouter({friendsService: friendsService})
  .router;

const friendRequestsRouter = new FriendRequestsRouter({
  friendsService: friendsService,
  friendRequestsService: friendRequestsService,
}).router;

// const wantsRouter = new WantsRouter({
//   wantsService: wantsService,
// }).router;

const app = express();

app.use(helmet());

app.use(cors());

app.use('/', healthCheckRouter);

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

app.use(fileUpload());

app.use(
  new Auth({
    firebaseAdminAuth,
  }).requireAuth
);

app.use('/v1/friends', friendsRouter);

app.use('/v1/friend-requests', friendRequestsRouter);

// app.use('/v1/wants', wantsRouter);

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
