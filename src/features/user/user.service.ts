import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ElasticSearchProviderService } from '../../providers/elastic-search-provider/elastic-search-provider.service';
import { UserEntity } from './types';

@Injectable()
export class UserService {
  private indexName = 'user';

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

    return await this.elasticSearchProvider.createDocument<UserEntity>(
      this.indexName,
      {
        username: payload.username,
        hashedPassword: payload.hashedPassword,
        createdAt: Date.now(),
      },
    );
  }

  async getUserByUsername(username: string) {
    const users = await this.elasticSearchProvider.listDocuments(UserEntity, {
      index: this.indexName,
      query: { match: { username } },
    });
    if (users.count === 0) {
      return null;
    }
    return users.list[0];
  }

  async getUserById(id: string) {
    const users = await this.elasticSearchProvider.listDocuments(UserEntity, {
      index: this.indexName,
      query: { ids: { values: [id] } },
    });
    if (users.count === 0) {
      return null;
    }
    return users.list[0];
  }

  async listUsers() {
    return await this.elasticSearchProvider.listDocuments(UserEntity, {
      index: this.indexName,
    });
  }
}
