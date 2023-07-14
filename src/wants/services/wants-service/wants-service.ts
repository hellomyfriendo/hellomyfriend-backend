import {
  Firestore,
  FirestoreDataConverter,
  Timestamp,
} from '@google-cloud/firestore';
import {Want, WantLocation, WantVisibility} from '../../models';
import {NotFoundError} from '../../../errors';
import {UsersService} from '../../../users';

const wantConverter: FirestoreDataConverter<Want> = {
  toFirestore: function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    modelObject: FirebaseFirestore.WithFieldValue<Want>
  ): FirebaseFirestore.DocumentData {
    throw new Error('Function not implemented.');
  },

  fromFirestore: function (
    snapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
  ): Want {
    const data = snapshot.data();

    return {
      id: snapshot.id,
      creatorId: data.creatorId,
      title: data.title,
      visibility: data.visibility,
      location: data.location,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  },
};

interface WantsServiceSettings {
  firestore: {
    client: Firestore;
    collections: {
      wants: string;
    };
  };
  usersService: UsersService;
}

interface CreateWantOptions {
  creatorId: string;
  title: string;
  visibility: WantVisibility;
  location: WantLocation;
}

class WantsService {
  constructor(private readonly settings: WantsServiceSettings) {}

  async createWant(options: CreateWantOptions) {
    const creator = await this.settings.usersService.getUserByFirebaseUid(
      options.creatorId
    );

    if (!creator) {
      throw new NotFoundError(`Creator uid ${options.creatorId} not found`);
    }

    const now = new Date();

    const wantDocRef = await this.settings.firestore.client
      .collection(this.settings.firestore.collections.wants)
      .add({
        creatorId: creator.id,
        title: options.title,
        visibility: options.visibility,
        location: options.location,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

    return await this.getWantById(wantDocRef.id)!;
  }

  async getWantById(wantId: string) {
    const userDocSnapshot = await this.settings.firestore.client
      .doc(`${this.settings.firestore.collections.wants}/${wantId}`)
      .withConverter(wantConverter)
      .get();

    const userDocData = userDocSnapshot.data();

    return userDocData;
  }
}

export {WantsService};
