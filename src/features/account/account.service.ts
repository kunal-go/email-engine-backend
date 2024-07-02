import {
  Inject,
  Injectable,
  UnprocessableEntityException,
  forwardRef,
} from '@nestjs/common';
import { PayloadShape } from '../../common/types';
import { DatabaseService } from '../database/database.service';
import { FolderService } from '../folder/folder.service';
import { AccountEntity } from './types';

@Injectable()
export class AccountService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(forwardRef(() => FolderService))
    private readonly folderService: FolderService,
  ) {}

  getAccountIndexName(userId: string) {
    return `account__${userId}`;
  }

  async createAccount(userId: string, data: PayloadShape<AccountEntity>) {
    const account = await this.getAccountByEmail(userId, data.email);
    if (account) {
      throw new UnprocessableEntityException(
        'Account already exists with this email',
      );
    }

    const index = this.getAccountIndexName(userId);
    return await this.database.createDocument<AccountEntity>(index, data);
  }

  async getAccountByEmail(userId: string, email: string) {
    const index = this.getAccountIndexName(userId);
    const accounts = await this.database.getDocumentList(AccountEntity, {
      index,
      query: { match: { email } },
    });
    if (accounts.count === 0) {
      return null;
    }

    // for (const account of accounts.list) {
    //   if (account.metadata.type === AccountType.Microsoft) {
    //     account.metadata.refreshToken
    //   }
    // }

    return accounts.list[0];
  }

  async getAccountById(userId: string, accountId: string) {
    const index = this.getAccountIndexName(userId);
    const accounts = await this.database.getDocumentList(AccountEntity, {
      index,
      query: { ids: { values: [accountId] } },
    });
    if (accounts.count === 0) {
      return null;
    }
    return accounts.list[0];
  }

  async deleteAccount(userId: string, accountId: string) {
    const account = await this.getAccountById(userId, accountId);
    if (!account) {
      throw new UnprocessableEntityException('Account not found');
    }

    const mailFolders = await this.folderService.getFolderList(accountId);
    for (const mailFolder of mailFolders.list) {
      await this.folderService.deleteFolder(accountId, mailFolder.id);
    }

    await this.database.deleteDocument(account.index, account.id);
  }

  async listAccounts(userId: string) {
    const index = this.getAccountIndexName(userId);
    return await this.database.getDocumentList(AccountEntity, {
      index,
    });
  }

  async overwriteAccountMetadata(
    account: AccountEntity,
    metadata: AccountEntity['metadata'],
  ) {
    await this.database.updateDocument<AccountEntity>(
      account.index,
      account.id,
      { metadata },
    );
  }
}
