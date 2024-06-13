import {
  Inject,
  Injectable,
  UnprocessableEntityException,
  forwardRef,
} from '@nestjs/common';
import { ElasticSearchProviderService } from '../../providers/elastic-search-provider/elastic-search-provider.service';
import { MsGraphApiProviderService } from '../../providers/ms-graph-api-provider/ms-graph-api-provider.service';
import { UserService } from '../user/user.service';
import { AccountEntity, AccountType } from './types';

@Injectable()
export class AccountService {
  constructor(
    private readonly elasticSearchProvider: ElasticSearchProviderService,
    @Inject(forwardRef(() => MsGraphApiProviderService))
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

    const account = await this.getAccountByEmail(user.id, microsoftUser.mail);
    if (account) {
      throw new UnprocessableEntityException(
        'Account already exists with this email',
      );
    }

    const index = this.getAccountIndexName(user.id);
    return await this.elasticSearchProvider.createDocument<AccountEntity>(
      index,
      {
        type: AccountType.Microsoft,
        createdAt: Date.now(),
        email: microsoftUser.mail,
        externalId: microsoftUser.id,
        name: microsoftUser.displayName,
        label: microsoftUser.mail,
        accessToken,
        refreshToken,
      },
    );
  }

  private getAccountIndexName(userId: string) {
    return `account__${userId}`;
  }

  async getAccountByEmail(userId: string, email: string) {
    const index = this.getAccountIndexName(userId);
    const accounts =
      await this.elasticSearchProvider.listDocuments<AccountEntity>(
        AccountEntity,
        index,
        { match: { email } },
      );
    if (accounts.count === 0) {
      return null;
    }

    return accounts.list[0];
  }

  async getAccountByAccessToken(userId: string, accessToken: string) {
    const index = this.getAccountIndexName(userId);
    const accounts =
      await this.elasticSearchProvider.listDocuments<AccountEntity>(
        AccountEntity,
        index,
        { match: { accessToken } },
      );
    if (accounts.count === 0) {
      return null;
    }

    return accounts.list[0];
  }

  async getAccountById(userId: string, accountId: string) {
    const index = this.getAccountIndexName(userId);
    const accounts = await this.elasticSearchProvider.listDocuments(
      AccountEntity,
      index,
      { ids: { values: [accountId] } },
    );
    if (accounts.count === 0) {
      return null;
    }
    return accounts.list[0];
  }

  async listAccounts(userId: string) {
    const index = this.getAccountIndexName(userId);
    return await this.elasticSearchProvider.listDocuments(AccountEntity, index);
  }

  async updateAccountTokens(
    account: AccountEntity,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    await this.elasticSearchProvider.updateDocument<AccountEntity>(
      account.index,
      account.id,
      { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
    );
  }
}
