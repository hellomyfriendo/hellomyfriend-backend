import {Firestore, FirestoreDataConverter} from '@google-cloud/firestore';
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
      name: data.name,
      createdAt: snapshot.createTime.toDate(),
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
  id: string;
  name: string;
}

class UsersService {
  constructor(private readonly settings: UsersServiceSettings) {}

  async createUser(options: CreateUserOptions): Promise<User> {
    const existingUser = await this.getUserById(options.id);

    if (existingUser) {
      throw new AlreadyExistsError(`User ${options.id} already exists`);
    }

    await this.settings.firestore.client
      .collection(this.settings.firestore.collections.users)
      .doc(options.id)
      .set({
        name: options.name,
      });

    const user = await this.getUserById(options.id);

    if (!user) {
      throw new Error(`User ${options.id} not found. This should never happen`);
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
}

export {UsersService};
