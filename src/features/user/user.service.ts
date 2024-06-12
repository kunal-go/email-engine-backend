import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ElasticSearchProviderService } from '../../providers/elastic-search-provider/elastic-search-provider.service';

@Injectable()
export class UserService {
  constructor(
    private readonly elasticSearchProvider: ElasticSearchProviderService,
  ) {}

  async createUser(payload: { username: string; hashedPassword: string }) {
    const existingUser = await this.getUserByUsername(payload.username);
    if (existingUser) {
      throw new UnprocessableEntityException(
        'User already exists with this username',
      );
    }

    return await this.elasticSearchProvider.createDocument('users', {
      username: payload.username,
      hashedPassword: payload.hashedPassword,
      createdAt: new Date(),
    });
  }

  async getUserByUsername(username: string) {
    const users = await this.elasticSearchProvider.listDocuments('users', {
      match: { username },
    });
    if (users.count === 0) {
      return null;
    }
    return users.list[0];
  }

  async getUserById(id: string) {
    const users = await this.elasticSearchProvider.listDocuments('users', {
      ids: { values: [id] },
    });
    if (users.count === 0) {
      return null;
    }
    return users.list[0];
  }

  async listUsers() {
    return await this.elasticSearchProvider.listDocuments('users');
  }

  async deleteUser(username: string) {
    const user = await this.getUserByUsername(username);
    if (!user) {
      throw new UnprocessableEntityException('User does not exist');
    }
    return await this.elasticSearchProvider.deleteDocument('users', user.id);
  }
}
