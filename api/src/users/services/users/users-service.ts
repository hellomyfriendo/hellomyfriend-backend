import {Sql} from 'postgres';
import {User} from '../../models';

interface UsersServiceSettings {
  sql: Sql;
}

class UsersService {
  private readonly usersTable = 'users';

  constructor(private readonly settings: UsersServiceSettings) {}

  async getUserById(userId: string): Promise<User | undefined> {
    const {sql} = this.settings;

    const [user]: [User?] = await sql`
      SELECT *
      FROM ${sql(this.usersTable)}
      WHERE id = ${userId}
    `;

    return user;
  }
}

export {UsersService};
