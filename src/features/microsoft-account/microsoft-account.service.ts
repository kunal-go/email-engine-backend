import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { AccountService } from '../account/account.service';
import { AccountEntity, AccountType } from '../account/types';
import { UserEntity } from '../user/types';
import { MicrosoftExternalApiService } from './microsoft-external-api.service';

@Injectable()
export class MicrosoftAccountService {
  constructor(
    private readonly accountService: AccountService,
    @Inject(forwardRef(() => MicrosoftExternalApiService))
    private readonly microsoftExternalApiProvider: MicrosoftExternalApiService,
  ) {}

  async linkMicrosoftAccount(payload: {
    user: UserEntity;
    authorizationCode: string;
  }) {
    const { accessToken, refreshToken } =
      await this.microsoftExternalApiProvider.createAuthTokensByCode(
        payload.authorizationCode,
      );
    const externalUser =
      await this.microsoftExternalApiProvider.fetchUser(accessToken);

    return await this.accountService.createAccount(payload.user.id, {
      email: externalUser.mail,
      name: externalUser.displayName,
      createdAt: Date.now(),
      metadata: {
        type: AccountType.Microsoft,
        externalId: externalUser.id,
        accessToken,
        refreshToken,
      },
    });
  }

  async updateMicrosoftAccountAuthTokens(
    account: AccountEntity,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    await this.accountService.overwriteAccountMetadata(account, {
      ...account.metadata,
      ...tokens,
    });
  }
}
