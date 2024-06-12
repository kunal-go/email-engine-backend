import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ElasticSearchProviderService } from '../../providers/elastic-search-provider/elastic-search-provider.service';
import { MsGraphApiProviderService } from '../../providers/ms-graph-api-provider/ms-graph-api-provider.service';
import { UserService } from '../user/user.service';
import { AccountType } from './types';

@Injectable()
export class AccountService {
  constructor(
    private readonly elasticSearchProvider: ElasticSearchProviderService,
    private readonly msGraphApiProvider: MsGraphApiProviderService,
    private readonly userService: UserService,
  ) {}

  async createAccountWithMicrosoftAuth(payload: {
    userId: string;
    authorizationCode: string;
  }) {
    const user = await this.userService.getUserById(payload.userId);
    if (!user) {
      throw new UnprocessableEntityException('User does not exist');
    }

    const { accessToken, refreshToken } =
      await this.msGraphApiProvider.createTokens(payload.authorizationCode);
    const microsoftUser = await this.msGraphApiProvider.getUser(accessToken);

    const account = await this.getUserAccountByEmail(
      user.id,
      microsoftUser.email,
    );
    if (account) {
      throw new UnprocessableEntityException(
        'Account already exists with this email',
      );
    }

    const index = this.getAccountIndexName(user.id);
    return await this.elasticSearchProvider.createDocument(index, {
      type: AccountType.Microsoft,
      createdAt: new Date(),
      email: microsoftUser.email,
      userId: microsoftUser.id,
      name: microsoftUser.name,
      label: microsoftUser.email,
      accessToken,
      refreshToken,
    });
  }

  private getAccountIndexName(userId: string) {
    return `accounts-${userId}`;
  }

  async getUserAccountByEmail(userId: string, email: string) {
    const index = this.getAccountIndexName(userId);
    const accounts = await this.elasticSearchProvider.listDocuments(index, {
      match: { email },
    });
    if (accounts.count === 0) {
      return null;
    }
    return accounts.list[0];
  }

  async listUserAccounts(userId: string) {
    const index = this.getAccountIndexName(userId);
    return await this.elasticSearchProvider.listDocuments(index);
  }
}
