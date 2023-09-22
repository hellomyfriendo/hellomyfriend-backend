import {Knex} from 'knex';
import {LanguageServiceClient} from '@google-cloud/language';
import {Storage} from '@google-cloud/storage';
import {ImageAnnotatorClient} from '@google-cloud/vision';
import {Client, GeocodeResult} from '@googlemaps/google-maps-services-js';
import dayjs from 'dayjs';
import {distanceBetween} from 'geofire-common';
import {orderBy} from 'lodash';
import mime from 'mime-types';
import {
  GeolocationCoordinates,
  Want,
  WantMemberRole,
  WantVisibility,
} from '../../models';
import {NotFoundError} from '../../../errors';
import {UsersService} from '../../../users';
import {FriendsService} from '../../../friends';

interface WantsServiceSettings {
  knex: Knex;
  language: {
    client: LanguageServiceClient;
  };
  storage: {
    client: Storage;
    buckets: {
      wantsAssets: string;
    };
  };
  vision: {
    imageAnnotatorClient: ImageAnnotatorClient;
  };
  googleApiKey: string;
  googleMapsServicesClient: Client;
  friendsService: FriendsService;
  usersService: UsersService;
}

interface WantRow {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  visibility: WantVisibility;
  address: string;
  latitude: number;
  longitude: number;
  googlePlaceId: string;
  radiusInMeters: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WantMemberRow {
  id: string;
  wantId: string;
  userId: string;
  role: WantMemberRole;
  createdAt: Date;
  updatedAt: Date;
}

interface WantVisibleToRow {
  id: string;
  wantId: string;
  userId: string;
  createdAt: Date;
}

interface WantImageRow {
  id: string;
  wantId: string;
  googleStorageBucket?: string;
  googleStorageFile?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateWantOptions {
  creatorId: string;
  title: string;
  description?: string;
  visibility: WantVisibility;
  visibleTo?: string[];
  address: string;
  radiusInMeters: number;
}

interface ListWantsOptions {
  userId?: string;
  orderBy?: {
    column: 'createdAt';
    order: 'asc' | 'desc';
  }[];
}

interface ListHomeFeedOptions {
  userId: string;
  geolocationCoordinates: GeolocationCoordinates;
}

interface UpdateWantOptions {
  administratorsIds?: string[];
  membersIds?: string[];
  title?: string;
  description?: string;
  visibility?: WantVisibility;
  visibleTo?: string[];
  image?: {
    data: Buffer;
    mimeType: string;
  };
}

class WantsService {
  private readonly wantsTable = 'wants';
  private readonly wantsMembersTable = 'wants_members';
  private readonly wantsVisibleToTable = 'wants_visible_to';
  private readonly wantsImagesTable = 'wants_images';

  constructor(private readonly settings: WantsServiceSettings) {}

  async createWant(options: CreateWantOptions): Promise<Want> {
    const creator = await this.settings.usersService.getUserById(
      options.creatorId
    );

    if (!creator) {
      throw new NotFoundError(`User ${options.creatorId} not found`);
    }

    await this.validateWantTitle(options.title);

    if (options.description) {
      await this.validateWantDescription(options.description);
    }

    const visibleTo: string[] = [];
    if (options.visibility === WantVisibility.Specific) {
      if (!options.visibleTo) {
        throw new RangeError(
          `options.visibleTo must be defined when options.visibility is ${options.visibility}`
        );
      }

      for (const userId of options.visibleTo) {
        const user = await this.settings.usersService.getUserById(userId);

        if (!user) {
          throw new NotFoundError(`User ${userId} not found`);
        }

        visibleTo.push(userId);
      }
    }

    const geocodeResult = await this.geocodeAddress(options.address);

    if (!Number.isInteger(options.radiusInMeters)) {
      throw new RangeError('options.radiusInMeters must be an integer');
    }

    const {knex} = this.settings;

    const wantRow = await knex.transaction(async trx => {
      const [wantRow] = await trx<WantRow>(this.wantsTable)
        .insert({
          creatorId: creator.id,
          title: options.title,
          description: options.description,
          visibility: options.visibility,
          address: geocodeResult.formatted_address,
          latitude: geocodeResult.geometry.location.lat,
          longitude: geocodeResult.geometry.location.lng,
          googlePlaceId: geocodeResult.place_id,
          radiusInMeters: options.radiusInMeters,
        })
        .returning('id');

      await trx<WantMemberRow>(this.wantsMembersTable).insert({
        wantId: wantRow.id,
        userId: creator.id,
        role: WantMemberRole.Administrator,
      });

      await trx<WantImageRow>(this.wantsImagesTable).insert({
        wantId: wantRow.id,
      });

      if (visibleTo.length > 0) {
        await trx<WantVisibleToRow>(this.wantsVisibleToTable).insert(
          visibleTo.map(userId => {
            return {
              wantId: wantRow.id,
              userId,
            };
          })
        );
      }

      return wantRow;
    });

    const want = await this.getWantById(wantRow.id);

    if (!want) {
      throw new Error(`Want ${wantRow.id} not found. This should not happen`);
    }

    return want;
  }

  async getWantById(wantId: string): Promise<Want | undefined> {
    const {knex} = this.settings;

    const [wantRow] = await knex<WantRow>(this.wantsTable).where({id: wantId});

    const members = await knex<WantMemberRow>(this.wantsMembersTable).where({
      wantId: wantRow.id,
    });

    const visibleTo = await knex<WantVisibleToRow>(
      this.wantsVisibleToTable
    ).where({wantId: wantRow.id});

    const imageURL = await this.getWantImageURL(wantId);

    const want: Want = {
      id: wantId,
      creatorId: wantRow.creatorId,
      administratorsIds: members
        .filter(member => member.role === WantMemberRole.Administrator)
        .map(member => member.userId),
      membersIds: members
        .filter(member => member.role === WantMemberRole.Member)
        .map(member => member.userId),
      title: wantRow.title,
      description: wantRow.description,
      imageURL,
      visibility: wantRow.visibility,
      visibleTo: visibleTo.map(visibleTo => visibleTo.userId),
      address: wantRow.address,
      coordinates: {
        latitude: wantRow.latitude,
        longitude: wantRow.longitude,
      },
      radiusInMeters: wantRow.radiusInMeters,
      createdAt: wantRow.createdAt,
      updatedAt: wantRow.updatedAt,
    };

    return want;
  }

  async listWants(options: ListWantsOptions): Promise<Want[]> {
    const {knex} = this.settings;

    const wantRows: Pick<WantRow, 'id'>[] = await knex<WantRow>(this.wantsTable)
      .select(`${this.wantsTable}.id`)
      .modify(queryBuilder => {
        if (options.userId) {
          queryBuilder.join(
            this.wantsMembersTable,
            `${this.wantsTable}.id`,
            '=',
            `${this.wantsMembersTable}.wantId`
          );
        }

        if (options.orderBy) {
          queryBuilder.orderBy(
            options.orderBy.map(ordering => {
              return {
                column: `${this.wantsTable}.${ordering.column}`,
                order: ordering.order,
              };
            })
          );
        }

        return queryBuilder;
      });

    return await Promise.all(
      wantRows.map(async wantRow => {
        const want = await this.getWantById(wantRow.id);

        if (!want) {
          throw new Error(
            `Want ${wantRow.id} not found. This should not happen`
          );
        }

        return want;
      })
    );
  }

  async listHomeFeed(options: ListHomeFeedOptions): Promise<Want[]> {
    interface Row {
      id: string;
      visibility: WantVisibility;
      latitude: number;
      longitude: number;
    }

    const calculateScore = (options: ListHomeFeedOptions, row: Row): number => {
      let score = 0;

      switch (row.visibility) {
        case WantVisibility.Friends:
          score += 2;
          break;
        case WantVisibility.Specific:
          score += 1;
          break;
      }

      const wantDistanceInKm = distanceBetween(
        [
          options.geolocationCoordinates.latitude,
          options.geolocationCoordinates.longitude,
        ],
        [row.latitude, row.longitude]
      );

      if (wantDistanceInKm < 2) {
        score += 2;
      } else if (wantDistanceInKm < 15) {
        score += 1;
      }

      return score;
    };

    const {knex, friendsService, usersService} = this.settings;

    const user = await usersService.getUserById(options.userId);

    if (!user) {
      throw new NotFoundError(`User ${options.userId} not found`);
    }

    const userFriendships = await friendsService.listFriendships({
      userId: user.id,
    });

    const userFriendsIds = userFriendships.map(friendship => {
      if (friendship.user2Id !== user.id) {
        return friendship.user2Id;
      }
      return friendship.user1Id;
    });

    const publicWantsRows = await knex<WantRow>(this.wantsTable)
      .select('id', 'visibility', 'latitude', 'longitude')
      .where('visibility', WantVisibility.Public)
      .whereRaw(
        `ST_DWithin(ST_MakePoint(longitude, latitude)::geography, ST_MakePoint(${options.geolocationCoordinates.longitude}, ${options.geolocationCoordinates.latitude})::geography, radius_in_meters)`
      );

    const friendsWantsRows = await knex<WantRow>(this.wantsTable)
      .select('id', 'visibility', 'latitude', 'longitude')
      .where('visibility', WantVisibility.Friends)
      .whereIn('creatorId', userFriendsIds)
      .whereRaw(
        `ST_DWithin(ST_MakePoint(longitude, latitude)::geography, ST_MakePoint(${options.geolocationCoordinates.longitude}, ${options.geolocationCoordinates.latitude})::geography, radius_in_meters)`
      );

    const visibleToWantsRows = await knex<WantRow>(this.wantsTable)
      .select(
        `${this.wantsTable}.id`,
        `${this.wantsTable}.visibility`,
        `${this.wantsTable}.latitude`,
        `${this.wantsTable}.longitude`
      )
      .join(
        this.wantsVisibleToTable,
        `${this.wantsTable}.id`,
        '=',
        `${this.wantsVisibleToTable}.wantId`
      )
      .where(`${this.wantsTable}.visibility`, WantVisibility.Specific)
      .where(`${this.wantsVisibleToTable}.userId`, user.id)
      .whereRaw(
        `ST_DWithin(ST_MakePoint(longitude, latitude)::geography, ST_MakePoint(${options.geolocationCoordinates.longitude}, ${options.geolocationCoordinates.latitude})::geography, ${this.wantsTable}.radius_in_meters)`
      );

    const rows = [
      ...publicWantsRows,
      ...friendsWantsRows,
      ...visibleToWantsRows,
    ];

    const orderedRows = orderBy(
      rows,
      row => calculateScore(options, row),
      'desc'
    );

    return await Promise.all(
      orderedRows.map(async row => {
        const want = await this.getWantById(row.id);

        if (!want) {
          throw new Error(`Want ${row.id} not found. This should not happen`);
        }

        return want;
      })
    );
  }

  async updateWantById(
    wantId: string,
    options: UpdateWantOptions
  ): Promise<Want> {
    const want = await this.getWantById(wantId);

    if (!want) {
      throw new NotFoundError(`Want ${wantId} not found`);
    }

    if (options.administratorsIds) {
      await this.validateWantAdministratorsIds(options.administratorsIds);
    }

    if (options.membersIds) {
      await this.validateWantMembersIds(options.membersIds);
    }

    if (options.title) {
      await this.validateWantTitle(options.title);
    }

    if (options.description) {
      await this.validateWantDescription(options.description);
    }

    if (options.visibility === WantVisibility.Specific) {
      if (!options.visibleTo) {
        throw new RangeError(
          `options.visibleTo must be defined when options.visibility is ${options.visibility}`
        );
      }

      await this.validateWantVisibleTo(options.visibleTo);
    }

    const {knex} = this.settings;

    await knex.transaction(async trx => {
      if (options.administratorsIds) {
        await trx<WantMemberRow>(this.wantsMembersTable)
          .where({wantId: want.id})
          .whereIn('userId', options.administratorsIds)
          .update({
            role: WantMemberRole.Administrator,
            updatedAt: knex.fn.now(),
          });
      }

      if (options.membersIds) {
        await trx<WantMemberRow>(this.wantsMembersTable)
          .where({wantId: want.id})
          .whereIn('userId', options.membersIds)
          .update({role: WantMemberRole.Member, updatedAt: knex.fn.now()});
      }

      await trx<WantRow>(this.wantsTable)
        .where({id: want.id})
        .modify(queryBuilder => {
          if (options.title) {
            queryBuilder.update({title: options.title});
          }

          if (options.description) {
            queryBuilder.update({description: options.description});
          }

          if (options.visibility) {
            queryBuilder.update({visibility: options.visibility});
          }

          if (options.title || options.description || options.visibility) {
            queryBuilder.update({updatedAt: knex.fn.now()});
          }
        });

      if (options.visibility === WantVisibility.Specific && options.visibleTo) {
        await trx<WantVisibleToRow>(this.wantsVisibleToTable)
          .where({wantId: want.id})
          .delete();

        await trx<WantVisibleToRow>(this.wantsVisibleToTable).insert(
          options.visibleTo.map(userId => {
            return {
              wantId: want.id,
              userId,
            };
          })
        );
      }

      if (options.image) {
        const wantImageUploadResult = await this.uploadWantImage(want.id, {
          data: options.image.data,
          mimeType: options.image.mimeType,
        });

        await trx<WantImageRow>(this.wantsImagesTable)
          .where({wantId: want.id})
          .update({
            googleStorageBucket: wantImageUploadResult.storage.bucket,
            googleStorageFile: wantImageUploadResult.storage.fileName,
            updatedAt: knex.fn.now(),
          });
      }
    });

    const updatedWant = await this.getWantById(wantId);

    if (!updatedWant) {
      throw new Error(
        `Updated Want ${wantId} not found. This should not happen`
      );
    }

    return updatedWant;
  }

  private async getWantImageURL(wantId: string): Promise<string | undefined> {
    const {knex, storage} = this.settings;

    const [wantImageRow] = await knex<WantImageRow>(
      this.wantsImagesTable
    ).where({wantId});

    if (!(wantImageRow.googleStorageBucket && wantImageRow.googleStorageFile)) {
      return;
    }

    const expires = dayjs().add(1, 'hour').toDate();

    const [imageURL] = await storage.client
      .bucket(wantImageRow.googleStorageBucket)
      .file(wantImageRow.googleStorageFile)
      .getSignedUrl({
        action: 'read',
        expires,
      });

    return imageURL;
  }

  private async uploadWantImage(
    wantId: string,
    // TODO(Marcus): Check mimeType from Buffer? Could use https://github.com/sindresorhus/file-type but converting this project to ESM seems a bit of a hassle at this point.
    image: {data: Buffer; mimeType: string}
  ): Promise<{storage: {bucket: string; fileName: string}}> {
    const want = await this.getWantById(wantId);

    if (!want) {
      throw new NotFoundError(`Want ${wantId} not found`);
    }

    // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    const allowedMimeTypes = [
      'image/bmp',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(image.mimeType)) {
      throw new RangeError(
        `Invalid image mimeType ${
          image.mimeType
        }. Allowed values: ${allowedMimeTypes.join(',')}`
      );
    }

    await this.validateWantImage(image.data);

    const {storage} = this.settings;

    const fileName = `images/${wantId}.${mime.extension(image.mimeType)}`;

    const gcsFile = storage.client
      .bucket(storage.buckets.wantsAssets)
      .file(fileName);

    await gcsFile.save(image.data);

    return {
      storage: {
        bucket: gcsFile.bucket.name,
        fileName: gcsFile.name,
      },
    };
  }

  private async geocodeAddress(address: string): Promise<GeocodeResult> {
    const geocodeAddressResponse =
      await this.settings.googleMapsServicesClient.geocode({
        params: {
          address,
          key: this.settings.googleApiKey,
        },
      });

    return geocodeAddressResponse.data.results[0];
  }

  private async detectTextExplicitContentCategory(
    text: string
  ): Promise<string | undefined> {
    const [moderateTextResult] =
      await this.settings.language.client.moderateText({
        document: {
          type: 'PLAIN_TEXT',
          content: text,
        },
      });

    if (!moderateTextResult.moderationCategories) {
      return;
    }

    const confidenceThreshold = 0.8;
    const excludedCategories = ['Health', 'Legal', 'Religion & Belief'];

    for (const moderationCategory of moderateTextResult.moderationCategories) {
      if (!moderationCategory.name) {
        continue;
      }

      if (excludedCategories.includes(moderationCategory.name)) {
        continue;
      }

      if (!moderationCategory.confidence) {
        continue;
      }

      if (moderationCategory.confidence > confidenceThreshold) {
        return moderationCategory.name;
      }
    }

    return;
  }

  private async detectImageExplicitContentCategory(
    imageData: Buffer
  ): Promise<string | undefined> {
    const [safeSearchDetectionResult] =
      await this.settings.vision.imageAnnotatorClient.safeSearchDetection(
        imageData
      );

    const detections = safeSearchDetectionResult.safeSearchAnnotation;

    if (!detections) {
      return;
    }

    if (detections.adult === 'LIKELY' || detections.adult === 'VERY_LIKELY') {
      return 'Adult';
    }

    if (
      detections.medical === 'LIKELY' ||
      detections.medical === 'VERY_LIKELY'
    ) {
      return 'Medical';
    }

    if (detections.racy === 'LIKELY' || detections.racy === 'VERY_LIKELY') {
      return 'Racy';
    }

    if (detections.spoof === 'LIKELY' || detections.spoof === 'VERY_LIKELY') {
      return 'Spoof';
    }

    if (
      detections.violence === 'LIKELY' ||
      detections.violence === 'VERY_LIKELY'
    ) {
      return 'Violence';
    }

    return;
  }

  private async validateWantAdministratorsIds(adminsIds: string[]) {
    for (const userId of adminsIds) {
      const user = await this.settings.usersService.getUserById(userId);

      if (!user) {
        throw new NotFoundError(`User ${userId} not found`);
      }
    }
  }

  private async validateWantMembersIds(membersIds: string[]) {
    for (const userId of membersIds) {
      const user = await this.settings.usersService.getUserById(userId);

      if (!user) {
        throw new NotFoundError(`User ${userId} not found`);
      }
    }
  }

  private async validateWantTitle(text: string) {
    const explicitContentCategory =
      await this.detectTextExplicitContentCategory(text);

    if (explicitContentCategory) {
      throw new RangeError(
        `${explicitContentCategory} detected in title: ${text}. Explicit content is not allowed.`
      );
    }
  }

  private async validateWantDescription(text: string) {
    const explicitContentCategory =
      await this.detectTextExplicitContentCategory(text);

    if (explicitContentCategory) {
      throw new RangeError(
        `${explicitContentCategory} detected in description: ${text}. Explicit content is not allowed.`
      );
    }
  }

  private async validateWantVisibleTo(visibleToUserIds: string[]) {
    for (const userId of visibleToUserIds) {
      const user = await this.settings.usersService.getUserById(userId);

      if (!user) {
        throw new NotFoundError(`User ${userId} not found`);
      }
    }
  }

  private async validateWantImage(imageData: Buffer) {
    const explicitContentCategory =
      await this.detectImageExplicitContentCategory(imageData);

    if (explicitContentCategory) {
      throw new RangeError(
        `${explicitContentCategory} content detected. Explicit content is not allowed. `
      );
    }
  }
}

export {WantsService};
