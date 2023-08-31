import {Auth} from 'firebase-admin/auth';
import {User} from '../../models';

interface UsersServiceSettings {
  auth: Auth;
}

class UsersService {
  constructor(private readonly settings: UsersServiceSettings) {}

  async getUserById(userId: string): Promise<User | undefined> {
    const userRecord = await this.settings.auth.getUser(userId);

    const user: User = {
      id: userRecord.uid,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
    };

    return user;
  }
}

export {UsersService};
