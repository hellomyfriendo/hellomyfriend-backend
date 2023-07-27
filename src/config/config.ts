import {Joi} from 'celebrate';

const envVarsSchema = Joi.object()
  .keys({
    GOOGLE_API_KEY: Joi.string().required(),
    GOOGLE_PROJECT_ID: Joi.string().required(),
    LOG_LEVEL: Joi.string().valid('debug', 'info').default('info'),
    PORT: Joi.number().integer().required(),
    K_REVISION: Joi.string().required(),
    K_SERVICE: Joi.string().required(),
    FRIENDS_FIRESTORE_FOLLOWS_COLLECTION: Joi.string().required(),
    FRIENDS_FIRESTORE_FRIEND_REQUESTS_COLLECTION: Joi.string().required(),
    USERS_FIRESTORE_USERS_COLLECTION: Joi.string().required(),
    WANTS_FIRESTORE_WANTS_COLLECTION: Joi.string().required(),
    WANTS_STORAGE_WANTS_ASSETS_BUCKET: Joi.string().required(),
  })
  .unknown();

const {value: envVars, error} = envVarsSchema.validate(process.env);

if (error) {
  throw error;
}

const config = {
  google: {
    apiKey: envVars.GOOGLE_API_KEY,
    cloudRun: {
      revision: envVars.K_REVISION,
      service: envVars.K_SERVICE,
    },
    projectId: envVars.GOOGLE_PROJECT_ID,
  },
  logLevel: envVars.LOG_LEVEL,
  port: envVars.PORT,
  friends: {
    firestore: {
      collections: {
        follows: envVars.FRIENDS_FIRESTORE_FOLLOWS_COLLECTION,
        friendRequests: envVars.FRIENDS_FIRESTORE_FRIEND_REQUESTS_COLLECTION,
      },
    },
  },
  users: {
    firestore: {
      collections: {
        users: envVars.USERS_FIRESTORE_USERS_COLLECTION,
      },
    },
  },
  wants: {
    firestore: {
      collections: {
        wants: envVars.WANTS_FIRESTORE_WANTS_COLLECTION,
      },
    },
    storage: {
      buckets: {
        wantsAssets: envVars.WANTS_STORAGE_WANTS_ASSETS_BUCKET,
      },
    },
  },
};

export {config};
