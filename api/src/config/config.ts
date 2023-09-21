import {Joi} from 'celebrate';

const envVarsSchema = Joi.object()
  .keys({
    PGHOST: Joi.string().required(),
    PGPORT: Joi.number().integer().required(),
    PGUSERNAME: Joi.string().required(),
    PGPASSWORD: Joi.string().required(),
    PGDATABASE: Joi.string().required(),
    GOOGLE_API_KEY: Joi.string().required(),
    GOOGLE_PROJECT_ID: Joi.string().required(),
    K_REVISION: Joi.string().required(),
    K_SERVICE: Joi.string().required(),
    LOG_LEVEL: Joi.string().valid('debug', 'info').default('info'),
    PORT: Joi.number().integer().required(),
    WANTS_V1_STORAGE_WANTS_ASSETS_BUCKET: Joi.string().required(),
  })
  .unknown();

const {value: envVars, error} = envVarsSchema.validate(process.env);

if (error) {
  throw error;
}

const config = {
  database: {
    host: envVars.PGHOST,
    port: envVars.PGPORT,
    username: envVars.PGUSERNAME,
    password: envVars.PGPASSWORD,
    name: envVars.PGDATABASE,
  },
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
  wants: {
    storage: {
      buckets: {
        wantsAssets: envVars.WANTS_V1_STORAGE_WANTS_ASSETS_BUCKET,
      },
    },
  },
};

export {config};
