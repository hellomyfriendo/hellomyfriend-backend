import {
  FieldValue,
  Firestore,
  FirestoreDataConverter,
} from '@google-cloud/firestore';
import {User} from '../../models';
import {AlreadyExistsError} from '../../../../errors';

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

  async createUser(options: CreateUserOptions): Promise<User> {
    const existingUserByUid = await this.getUserByFirebaseUid(
      options.firebaseUid
    );

    if (existingUserByUid) {
      throw new AlreadyExistsError(
        `User uid ${options.firebaseUid} already exists`
      );
    }

    const userDocRef = await this.settings.firestore.client
      .collection(this.settings.firestore.collections.users)
      .add({
        uid: options.firebaseUid,
        createdAt: FieldValue.serverTimestamp(),
      });

    const user = await this.getUserById(userDocRef.id);

    if (!user) {
      throw new Error(
        `User ${userDocRef.id} not found. This should never happen`
      );
    }

    return user;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const userDocSnapshot = await this.settings.firestore.client
      .doc(`${this.settings.firestore.collections.users}/${userId}`)
      .withConverter(userConverter)
      .get();

    const userDocData = userDocSnapshot.data();

    return userDocData;
  }

  async getUserByFirebaseUid(uid: string) {
    const getUserByUidQuerySnapshot = await this.settings.firestore.client
      .collection(this.settings.firestore.collections.users)
      .withConverter(userConverter)
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (getUserByUidQuerySnapshot.empty) {
      return;
    }

    const userDocSnapshot = getUserByUidQuerySnapshot.docs[0];

    return userDocSnapshot.data();
  }
}

export {UsersService};
