import {Auth} from 'firebase-admin/auth';
import {User} from '../../models';

interface UsersServiceSettings {
  auth: Auth;
}

class UsersService {
  private readonly usersTable = 'users';

  constructor(private readonly settings: UsersServiceSettings) {}

  async getUserById(userId: string): Promise<User | undefined> {
    const user = await this.settings.auth.getUser(userId);

    return {
      id: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }
}

export {UsersService};
