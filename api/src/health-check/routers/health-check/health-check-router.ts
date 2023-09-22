import {Router} from 'express';
import {StatusCodes} from 'http-status-codes';
import {Knex} from 'knex';

interface HealthCheckRouterSettings {
  knex: Knex;
}

class HealthCheckRouter {
  constructor(private readonly settings: HealthCheckRouterSettings) {}

  get router() {
    const router = Router();

    router.get('/', async (req, res, next) => {
      try {
        const {knex} = this.settings;

        await knex.raw('SELECT VERSION()');

        return res.sendStatus(StatusCodes.OK);
      } catch (err) {
        return next(err);
      }
    });

    return router;
  }
}

export {HealthCheckRouter};
