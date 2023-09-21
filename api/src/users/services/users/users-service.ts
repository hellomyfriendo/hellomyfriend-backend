import {Auth} from 'firebase-admin/auth';
import {FirebaseError} from '@firebase/util';
import {User} from '../../models';

interface UsersServiceSettings {
  auth: Auth;
}

class UsersService {
  private readonly usersTable = 'users';

  constructor(private readonly settings: UsersServiceSettings) {}

  async getUserById(userId: string): Promise<User | undefined> {
    try {
      const user = await this.settings.auth.getUser(userId);

      return {
        id: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/user-not-found') {
          return;
        }
      }

      throw err;
    }
  }
}

export {UsersService};
