// import {Pool} from 'pg';
// import {LanguageServiceClient} from '@google-cloud/language';
// import {Storage} from '@google-cloud/storage';
// import {ImageAnnotatorClient} from '@google-cloud/vision';
// import {Client, GeocodeResult} from '@googlemaps/google-maps-services-js';
// import dayjs from 'dayjs';
// import {geohashForLocation, distanceBetween} from 'geofire-common';
// import {orderBy} from 'lodash';
// import mime from 'mime-types';
// import {GeolocationCoordinates, Want, WantVisibility} from '../../models';
// import {NotFoundError} from '../../../errors';
// import {UsersService} from '../../../users';
// import {FriendsService} from '../../../friends';

// interface WantsServiceSettings {
//   pool: Pool;
//   language: {
//     client: LanguageServiceClient;
//   };
//   storage: {
//     client: Storage;
//     buckets: {
//       wantsAssets: string;
//     };
//   };
//   vision: {
//     imageAnnotatorClient: ImageAnnotatorClient;
//   };
//   googleApiKey: string;
//   googleMapsServicesClient: Client;
//   friendsService: FriendsService;
//   usersService: UsersService;
// }

// interface CreateWantOptions {
//   creatorId: string;
//   title: string;
//   description?: string;
//   visibility: WantVisibility;
// }

// interface GetHomeWantsFeedOptions {
//   userId: string;
//   geolocationCoordinates?: GeolocationCoordinates;
// }

// interface UpdateWantOptions {
//   adminsIds?: string[];
//   membersIds?: string[];
//   title?: string;
//   description?: string;
//   visibility?: WantVisibility;
//   image?: {
//     data: Buffer;
//     mimeType: string;
//   };
// }

// class WantsService {
//   private readonly wantsTable = 'wants';

//   constructor(private readonly settings: WantsServiceSettings) {}

//   async createWant(options: CreateWantOptions): Promise<Want> {
//     const creator = await this.settings.usersService.getUserById(
//       options.creatorId
//     );

//     if (!creator) {
//       throw new NotFoundError(`User ${options.creatorId} not found`);
//     }

//     await this.validateWantTitle(options.title);

//     if (options.description) {
//       await this.validateWantDescription(options.description);
//     }

//     const queryResult = await this.settings.pool.query(
//       `
//       INSERT INTO ${this.wantsTable}(
//         creator_id,
//         admins_ids,
//         members_ids,
//         title,
//         description,
//         visibility
//       )
//       VALUES(
//         $1,
//         $2,
//         $3,
//         $4,
//         $5,
//         $6
//       )
//       RETURNING id, created_at, updated_at
//     `,
//       [
//         options.creatorId,
//         [options.creatorId],
//         [options.creatorId],
//         options.title,
//         options.description,
//         options.visibility,
//       ]
//     );

//     const row = queryResult.rows[0];

//     const want: Want = {
//       id: row[0],
//       creatorId: options.creatorId,
//       adminsIds: [options.creatorId],
//       membersIds: [options.creatorId],
//       title: options.title,
//       description: options.description,
//       visibility: options.visibility,
//       createdAt: row[1],
//       updatedAt: row[2],
//     };

//     return want;
//   }

//   async getWantById(wantId: string): Promise<Want | undefined> {
//     const queryResult = await this.settings.pool.query(
//       `
//       SELECT
//         creator_id,
//         admins_ids,
//         members_ids,
//         title,
//         description,
//         visibility,
//         image,
//         created_at,
//         updated_at
//       FROM ${this.wantsTable}
//       WHERE id = $1
//       AND deleted_at IS NULL
//     `,
//       [wantId]
//     );

//     if (queryResult.rowCount === 0) {
//       return;
//     }

//     const [
//       creatorId,
//       adminsIds,
//       membersIds,
//       title,
//       description,
//       visibility,
//       image,
//       createdAt,
//       updatedAt,
//     ] = queryResult.rows[0];

//     const want: Want = {
//       id: wantId,
//       creatorId,
//       adminsIds,
//       membersIds,
//       title,
//       description,
//       visibility,
//       image,
//       createdAt,
//       updatedAt,
//     };

//     return want;
//   }

//   async updateWantById(
//     wantId: string,
//     updateWantOptions: UpdateWantOptions
//   ): Promise<Want> {
//     let queryText = `
//       UPDATE ${this.wantsTable}
//       SET updated_at = CURRENT_TIMESTAMP
//     `;

//     const queryValues = [];

//     if (updateWantOptions.title) {
//       queryText = `${queryText}, title = $1`,
//     }

//     const wantDocRef = this.settings.firestore.client.doc(
//       `${this.settings.firestore.collections.wants}/${wantId}`
//     );

//     const wantDocSnapshot = await wantDocRef.get();

//     const wantData = wantDocSnapshot.data();

//     if (!wantData) {
//       throw new NotFoundError(`Want ${wantId} not found`);
//     }

//     if (wantData.deletedAt) {
//       throw new NotFoundError(`Want ${wantId} not found`);
//     }

//     if (!Object.values(updateWantOptions).some(option => option)) {
//       return (await this.getWantById(wantId))!;
//     }

//     await this.settings.firestore.client.runTransaction(async t => {
//       if (updateWantOptions.adminsIds) {
//         await this.validateWantAdminsIds(updateWantOptions.adminsIds);

//         wantData.adminsIds = updateWantOptions.adminsIds;
//       }

//       if (updateWantOptions.membersIds) {
//         await this.validateWantMembersIds(updateWantOptions.membersIds);

//         wantData.membersIds = updateWantOptions.membersIds;
//       }

//       if (updateWantOptions.title) {
//         await this.validateWantTitle(updateWantOptions.title);

//         wantData.title = updateWantOptions.title;
//       }

//       if (updateWantOptions.description) {
//         await this.validateWantDescription(updateWantOptions.description);

//         wantData.description = updateWantOptions.description;
//       }

//       if (updateWantOptions.visibility) {
//         wantData.visibility = await this.getWantDocVisibility(
//           updateWantOptions.visibility
//         );
//       }

//       if (updateWantOptions.image) {
//         const wantDocImage = await this.uploadWantImage(
//           wantId,
//           updateWantOptions.image
//         );

//         wantData.image = wantDocImage;
//       }

//       t.update(wantDocRef, {
//         ...wantData,
//         updatedAt: FieldValue.serverTimestamp(),
//       });
//     });

//     return (await this.getWantById(wantId))!;
//   }

//   async getHomeWantsFeed(options: GetHomeWantsFeedOptions): Promise<Want[]> {
//     // TODO(Marcus): iterate and optimize this, performance and user experience wise.

//     const listFriendsWantsDocs = async (userId: string) => {
//       const userFriends =
//         await this.settings.friendsService.listFriendsByUserId(userId);

//       if (userFriends.length === 0) {
//         return [];
//       }

//       const wantsDocsSnapshots = await this.settings.firestore.client
//         .collection(this.settings.firestore.collections.wants)
//         .withConverter(wantDocConverter)
//         .where('deletedAt', '==', null)
//         .where('creatorId', 'in', userFriends)
//         .where('visibility.visibleTo', '==', 'friends')
//         .get();

//       return wantsDocsSnapshots.docs.map(wantSnapshot => wantSnapshot.data());
//     };

//     const listUserTargetedWantsDocs = async (userId: string) => {
//       const wantsSnapshot = await this.settings.firestore.client
//         .collection(this.settings.firestore.collections.wants)
//         .withConverter(wantDocConverter)
//         .where('deletedAt', '==', null)
//         .where('visibility.visibleTo', 'array-contains', userId)
//         .get();

//       return wantsSnapshot.docs.map(wantSnapshot => wantSnapshot.data());
//     };

//     const listPublicWantsDocs = async () => {
//       const wantsSnapshot = await this.settings.firestore.client
//         .collection(this.settings.firestore.collections.wants)
//         .withConverter(wantDocConverter)
//         .where('deletedAt', '==', null)
//         .where('visibility.visibleTo', '==', 'public')
//         .get();

//       return wantsSnapshot.docs.map(wantSnapshot => wantSnapshot.data());
//     };

//     interface CalculateFeedScoreOptions {
//       wantDoc: WantDoc;
//       userGeolocationCoordinates?: GeolocationCoordinates;
//     }

//     // TODO(Marcus): This could be an interesting place to use machine learning. Maybe have it receive the userId too so the feed can be tailored.
//     const calculateFeedScore = (options: CalculateFeedScoreOptions): number => {
//       const calculateVisibilityScore = (wantDoc: WantDoc): number => {
//         switch (wantDoc.visibility.visibleTo) {
//           case WantVisibleTo.Friends:
//             return -0.2;
//           case WantVisibleTo.Public:
//             return -0.15;
//           default:
//             return -0.25;
//         }
//       };

//       const calculateCreatedAtScore = (want: WantDoc): number => {
//         const today = dayjs();
//         const createdAtDate = dayjs(want.createdAt);

//         switch (today.diff(createdAtDate, 'day')) {
//           case 0:
//           case 1:
//             return -0.25;
//           case 2:
//           case 3:
//             return -0.2;
//           default:
//             return -0.15;
//         }
//       };

//       const calculateMembersCountScore = (want: WantDoc): number => {
//         const membersCount = want.membersIds.length;

//         if (membersCount > 4) {
//           return -0.25;
//         } else if (membersCount > 2) {
//           return -0.2;
//         } else {
//           return -0.15;
//         }
//       };

//       const calculateLocationScore = (
//         wantDoc: WantDoc,
//         userGeolocationCoordinates?: GeolocationCoordinates
//       ): number => {
//         if (!wantDoc.visibility.location) {
//           return 0;
//         }

//         if (!userGeolocationCoordinates) {
//           return 0;
//         }

//         const distanceInKm = distanceBetween(
//           [
//             wantDoc.visibility.location.geometry.coordinates.latitude,
//             wantDoc.visibility.location.geometry.coordinates.longitude,
//           ],
//           [
//             userGeolocationCoordinates.latitude,
//             userGeolocationCoordinates.longitude,
//           ]
//         );

//         if (distanceInKm < 4) {
//           return -0.25;
//         } else if (distanceInKm < 8) {
//           return -0.2;
//         } else {
//           return -0.15;
//         }
//       };

//       const score =
//         calculateVisibilityScore(options.wantDoc) +
//         calculateCreatedAtScore(options.wantDoc) +
//         calculateMembersCountScore(options.wantDoc) +
//         calculateLocationScore(
//           options.wantDoc,
//           options.userGeolocationCoordinates
//         );

//       return score;
//     };

//     const user = await this.settings.usersService.getUserById(options.userId);

//     if (!user) {
//       throw new NotFoundError(`User ${options.userId} not found`);
//     }

//     const [userFriendsWantDocs, userTargetedWantDocs, publicWantDocs] =
//       await Promise.all([
//         listFriendsWantsDocs(user.id),
//         listUserTargetedWantsDocs(user.id),
//         listPublicWantsDocs(),
//       ]);

//     const relevantWantDocs = [
//       ...userFriendsWantDocs,
//       ...userTargetedWantDocs,
//       ...publicWantDocs,
//     ];

//     const orderedRelevantWantDocs = orderBy(relevantWantDocs, wantDoc =>
//       calculateFeedScore({
//         wantDoc,
//         userGeolocationCoordinates: options.geolocationCoordinates,
//       })
//     );

//     return await Promise.all(
//       orderedRelevantWantDocs.map(async wantDoc => {
//         return await this.toWant(wantDoc);
//       })
//     );
//   }

//   private async toWant(wantDoc: WantDoc): Promise<Want> {
//     const want: Want = {
//       id: wantDoc.id,
//       creatorId: wantDoc.creatorId,
//       adminsIds: wantDoc.adminsIds,
//       membersIds: wantDoc.membersIds,
//       title: wantDoc.title,
//       description: wantDoc.description,
//       visibility: {
//         visibleTo: wantDoc.visibility.visibleTo,
//       },
//       image: null,
//       createdAt: wantDoc.createdAt,
//       updatedAt: wantDoc.updatedAt,
//     };

//     if (wantDoc.visibility.location) {
//       want.visibility.location = {
//         address: wantDoc.visibility.location.address,
//         radiusInMeters: wantDoc.visibility.location.radiusInMeters,
//       };
//     }

//     if (wantDoc.image) {
//       const [signedUrl] = await this.settings.storage.client
//         .bucket(wantDoc.image.gcs.bucket)
//         .file(wantDoc.image.gcs.fileName)
//         .getSignedUrl({
//           action: 'read',
//           expires: dayjs().add(1, 'hour').toDate(),
//         });

//       want.image = {
//         url: signedUrl,
//       };
//     }

//     return want;
//   }

//   private async getWantDocVisibility(
//     visibility: WantVisibility
//   ): Promise<WantDocVisibility> {
//     let wantDocVisibility: WantDocVisibility = {
//       visibleTo: visibility.visibleTo,
//     };

//     if (visibility.location) {
//       const geocodedAddress = await this.geocodeAddress(
//         visibility.location.address
//       );

//       wantDocVisibility = {
//         ...wantDocVisibility,
//         location: {
//           address: visibility.location.address,
//           radiusInMeters: visibility.location.radiusInMeters,
//           googlePlaceId: geocodedAddress.place_id,
//           geometry: {
//             coordinates: {
//               latitude: geocodedAddress.geometry.location.lat,
//               longitude: geocodedAddress.geometry.location.lng,
//             },
//             geohash: geohashForLocation([
//               geocodedAddress.geometry.location.lat,
//               geocodedAddress.geometry.location.lng,
//             ]),
//           },
//         },
//       };
//     }

//     return wantDocVisibility;
//   }

//   private async uploadWantImage(
//     wantId: string,
//     // TODO(Marcus): Check mimeType from Buffer? Could use https://github.com/sindresorhus/file-type but converting this project to ESM seems a bit of a hassle at this point.
//     image: {data: Buffer; mimeType: string}
//   ): Promise<WantDocImage> {
//     const want = await this.getWantById(wantId);

//     if (!want) {
//       throw new NotFoundError(`Want ${wantId} not found`);
//     }

//     // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
//     const allowedMimeTypes = [
//       'image/bmp',
//       'image/jpeg',
//       'image/png',
//       'image/svg+xml',
//       'image/webp',
//     ];

//     if (!allowedMimeTypes.includes(image.mimeType)) {
//       throw new RangeError(
//         `Invalid image mimeType ${
//           image.mimeType
//         }. Allowed values: ${allowedMimeTypes.join(',')}`
//       );
//     }

//     await this.validateWantImage(image.data);

//     const fileName = `images/${wantId}.${mime.extension(image.mimeType)}`;

//     const gcsFile = this.settings.storage.client
//       .bucket(this.settings.storage.buckets.wantsAssets)
//       .file(fileName);

//     await gcsFile.save(image.data);

//     const wantDocImage: WantDocImage = {
//       gcs: {
//         bucket: this.settings.storage.buckets.wantsAssets,
//         fileName,
//       },
//     };

//     return wantDocImage;
//   }

//   private async geocodeAddress(address: string): Promise<GeocodeResult> {
//     const geocodeAddressResponse =
//       await this.settings.googleMapsServicesClient.geocode({
//         params: {
//           address,
//           key: this.settings.googleApiKey,
//         },
//       });

//     return geocodeAddressResponse.data.results[0];
//   }

//   private async detectTextExplicitContentCategory(
//     text: string
//   ): Promise<string | undefined> {
//     const [moderateTextResult] =
//       await this.settings.language.client.moderateText({
//         document: {
//           type: 'PLAIN_TEXT',
//           content: text,
//         },
//       });

//     if (!moderateTextResult.moderationCategories) {
//       return;
//     }

//     const confidenceThreshold = 0.8;
//     const excludedCategories = ['Health', 'Legal', 'Religion & Belief'];

//     for (const moderationCategory of moderateTextResult.moderationCategories) {
//       if (!moderationCategory.name) {
//         continue;
//       }

//       if (excludedCategories.includes(moderationCategory.name)) {
//         continue;
//       }

//       if (!moderationCategory.confidence) {
//         continue;
//       }

//       if (moderationCategory.confidence > confidenceThreshold) {
//         return moderationCategory.name;
//       }
//     }

//     return;
//   }

//   private async detectImageExplicitContentCategory(
//     imageData: Buffer
//   ): Promise<string | undefined> {
//     const [safeSearchDetectionResult] =
//       await this.settings.vision.imageAnnotatorClient.safeSearchDetection(
//         imageData
//       );

//     const detections = safeSearchDetectionResult.safeSearchAnnotation;

//     if (!detections) {
//       return;
//     }

//     if (detections.adult === 'LIKELY' || detections.adult === 'VERY_LIKELY') {
//       return 'Adult';
//     }

//     if (
//       detections.medical === 'LIKELY' ||
//       detections.medical === 'VERY_LIKELY'
//     ) {
//       return 'Medical';
//     }

//     if (detections.racy === 'LIKELY' || detections.racy === 'VERY_LIKELY') {
//       return 'Racy';
//     }

//     if (detections.spoof === 'LIKELY' || detections.spoof === 'VERY_LIKELY') {
//       return 'Spoof';
//     }

//     if (
//       detections.violence === 'LIKELY' ||
//       detections.violence === 'VERY_LIKELY'
//     ) {
//       return 'Violence';
//     }

//     return;
//   }

//   private async validateWantAdminsIds(adminsIds: string[]) {
//     for (const adminId of adminsIds) {
//       const adminUser = await this.settings.usersService.getUserById(adminId);

//       if (!adminUser) {
//         throw new NotFoundError(`User ${adminId} not found`);
//       }
//     }
//   }

//   private async validateWantMembersIds(membersIds: string[]) {
//     for (const memberId of membersIds) {
//       const memberUser = await this.settings.usersService.getUserById(memberId);

//       if (!memberUser) {
//         throw new NotFoundError(`User ${memberId} not found`);
//       }
//     }
//   }

//   private async validateWantTitle(text: string) {
//     const explicitContentCategory =
//       await this.detectTextExplicitContentCategory(text);

//     if (explicitContentCategory) {
//       throw new RangeError(
//         `${explicitContentCategory} detected in title: ${text}. Explicit content is not allowed.`
//       );
//     }
//   }

//   private async validateWantDescription(text: string) {
//     const explicitContentCategory =
//       await this.detectTextExplicitContentCategory(text);

//     if (explicitContentCategory) {
//       throw new RangeError(
//         `${explicitContentCategory} detected in description: ${text}. Explicit content is not allowed.`
//       );
//     }
//   }

//   private async validateWantImage(imageData: Buffer) {
//     const explicitContentCategory =
//       await this.detectImageExplicitContentCategory(imageData);

//     if (explicitContentCategory) {
//       throw new RangeError(
//         `${explicitContentCategory} content detected. Explicit content is not allowed. `
//       );
//     }
//   }
// }

// export {WantsService};
