import * as express from 'express';
import {celebrate, Joi, Segments} from 'celebrate';
import {StatusCodes} from 'http-status-codes';
import {WantsService} from '../../services';
import {GeolocationCoordinates, WantVisibleTo} from '../../models';
import {UnauthorizedError} from '../../../errors/unauthorized-error';
import {ForbiddenError, NotFoundError} from '../../../errors';

interface WantsRouterV1Settings {
  wantsService: WantsService;
}

class WantsRouterV1 {
  constructor(private readonly settings: WantsRouterV1Settings) {}

  get router() {
    const router = express.Router();

    router.post(
      '/',
      celebrate({
        [Segments.BODY]: Joi.object()
          .keys({
            title: Joi.string().required(),
            description: Joi.string(),
            visibility: Joi.object().keys({
              visibleTo: Joi.alternatives()
                .try(
                  Joi.string().valid(...Object.values(WantVisibleTo)),
                  Joi.array().items(Joi.string())
                )
                .required(),
              location: Joi.object().keys({
                address: Joi.string().required(),
                radiusInMeters: Joi.number().required(),
              }),
            }),
          })
          .required(),
      }),
      async (req, res, next) => {
        try {
          req.log.info(req, 'Create Want request received');

          const user = req.user;

          if (!user) {
            throw new UnauthorizedError('User not found in req');
          }

          const {title, description, visibility} = req.body;

          const want = await this.settings.wantsService.createWant({
            creator: user.id,
            title,
            description,
            visibility,
          });

          req.log.info(want, 'Want created!');

          return res.status(StatusCodes.CREATED).json(want);
        } catch (err) {
          return next(err);
        }
      }
    );

    router.post('/:wantId/upload-image', async (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          throw new UnauthorizedError('User not found in the request');
        }

        const {wantId} = req.params;

        req.log.info(
          req,
          `Upload image request for Want ${wantId} from user ${user.id} received`
        );

        const want = await this.settings.wantsService.getWantById(wantId);

        if (!want) {
          throw new NotFoundError(`Want ${wantId} not found`);
        }

        if (!want.adminsIds.includes(user.id)) {
          throw new ForbiddenError(
            `User ${user.id} cannot update Want ${want.id}`
          );
        }

        if (!req.files) {
          throw new RangeError('No files were uploaded');
        }

        const fileKeys = Object.keys(req.files);

        if (fileKeys.length !== 1) {
          throw new RangeError('A single file must be uploaded');
        }

        const uploadedImage = req.files[fileKeys[0]];

        if (!('data' in uploadedImage)) {
          throw new Error(
            "The uploaded file should contain the 'data' property"
          );
        }

        const updatedWant = await this.settings.wantsService.updateWantById(
          want.id,
          {
            image: {
              data: uploadedImage.data,
              mimeType: uploadedImage.mimetype,
            },
          }
        );

        req.log.info(updatedWant, `Want ${updatedWant.id} updated!`);

        return res.json(updatedWant);
      } catch (err) {
        return next(err);
      }
    });

    router.get(
      '/home-feed',
      celebrate({
        [Segments.QUERY]: Joi.object()
          .keys({
            latitude: Joi.number()
              .min(GeolocationCoordinates.minLatitude)
              .max(GeolocationCoordinates.maxLatitude),
            longitude: Joi.number()
              .min(GeolocationCoordinates.minLongitude)
              .max(GeolocationCoordinates.maxLongitude),
          })
          .required(),
      }),
      async (req, res, next) => {
        try {
          const user = req.user;

          if (!user) {
            throw new UnauthorizedError('User not found in the request');
          }

          let geolocationCoordinates;

          if (req.query.latitude || req.query.longitude) {
            if (!req.query.latitude) {
              throw new RangeError(
                'latitude is required when longitude is set'
              );
            }

            if (!req.query.longitude) {
              throw new RangeError(
                'longitude is required when latitude is set'
              );
            }

            geolocationCoordinates = new GeolocationCoordinates(
              Number.parseFloat(req.query.latitude as string),
              Number.parseFloat(req.query.longitude as string)
            );
          }

          const wantsFeed = await this.settings.wantsService.getHomeWantsFeed({
            userId: user.id,
            geolocationCoordinates,
          });

          return res.json(wantsFeed);
        } catch (err) {
          return next(err);
        }
      }
    );

    return router;
  }
}

export {WantsRouterV1};
