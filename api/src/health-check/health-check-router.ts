import {Router} from 'express';
import {StatusCodes} from 'http-status-codes';

class HealthCheckRouter {
  get router() {
    const router = Router();

    router.get('/', (req, res, next) => {
      try {
        return res.sendStatus(StatusCodes.OK);
      } catch (err) {
        return next(err);
      }
    });

    return router;
  }
}

export {HealthCheckRouter};
