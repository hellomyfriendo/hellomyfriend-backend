import {
  Firestore,
  FirestoreDataConverter,
  Timestamp,
} from '@google-cloud/firestore';
import {User} from '../../models';
import {AlreadyExistsError} from '../../../errors';

const userConverter: FirestoreDataConverter<User> = {
  toFirestore: function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    modelObject: FirebaseFirestore.WithFieldValue<User>
  ): FirebaseFirestore.DocumentData {
    throw new Error('Function not implemented.');
  },

  fromFirestore: function (
    snapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
  ): User {
    const data = snapshot.data();

    return {
      id: snapshot.id,
      firebaseUid: data.uid,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  },
};

interface UsersServiceSettings {
  firestore: {
    client: Firestore;
    collections: {
      users: string;
    };
  };
}

interface CreateUserOptions {
  firebaseUid: string;
}

class UsersService {
  constructor(private readonly settings: UsersServiceSettings) {}

  async createUser(options: CreateUserOptions) {
    const existingUserByUid = await this.getUserByFirebaseUid(
      options.firebaseUid
    );

    if (existingUserByUid) {
      throw new AlreadyExistsError(
        `User uid ${options.firebaseUid} already exists`
      );
    }

    const now = new Date();

    const userDocRef = await this.settings.firestore.client
      .collection(this.settings.firestore.collections.users)
      .add({
        uid: options.firebaseUid,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

    return await this.getUserById(userDocRef.id)!;
  }

  async getUserById(userId: string) {
    const userDocSnapshot = await this.settings.firestore.client
      .doc(`${this.settings.firestore.collections.users}/${userId}`)
      .withConverter(userConverter)
      .get();

    const userDocData = userDocSnapshot.data();

    return userDocData;
  }

  async getUserByFirebaseUid(userUid: string) {
    const getUserByUidQuerySnapshot = await this.settings.firestore.client
      .collection(this.settings.firestore.collections.users)
      .where('uid', '==', userUid)
      .limit(1)
      .withConverter(userConverter)
      .get();

    if (getUserByUidQuerySnapshot.empty) {
      return;
    }

    const userDocSnapshot = getUserByUidQuerySnapshot.docs[0];

    return userDocSnapshot.data();
  }
}

export {UsersService};
