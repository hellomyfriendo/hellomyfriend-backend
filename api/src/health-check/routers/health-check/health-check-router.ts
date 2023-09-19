import {Router} from 'express';
import {StatusCodes} from 'http-status-codes';
import {Sql} from 'postgres';

interface HealthCheckRouterSettings {
  sql: Sql;
}

class HealthCheckRouter {
  constructor(private readonly settings: HealthCheckRouterSettings) {}

  get router() {
    const router = Router();

    router.get('/', async (req, res, next) => {
      try {
        const {sql} = this.settings;

        await sql`
          SELECT VERSION()
        `;

        return res.sendStatus(StatusCodes.OK);
      } catch (err) {
        return next(err);
      }
    });

    return router;
  }
}

export {HealthCheckRouter};
