import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountService } from '../account/account.service';
import { AccountEntity, AccountType } from '../account/types';
import { MicrosoftAccountMailSyncService } from '../microsoft-account/microsoft-account-mail-sync.provider';
import {
  SYNC_ACCOUNT_FOLDERS_EVENT,
  SYNC_ACCOUNT_MESSAGES_EVENT,
} from './constants';

@Injectable()
export class EventConsumer {
  constructor(
    private readonly accountService: AccountService,
    private readonly microsoftAccountSyncService: MicrosoftAccountMailSyncService,
  ) {}

  @OnEvent(SYNC_ACCOUNT_FOLDERS_EVENT)
  async syncAccountFolders(payload: { userId: string; accountId: string }) {
    const account = await this.accountService.getAccountById(
      payload.userId,
      payload.accountId,
    );
    if (!account) {
      console.log('Account not found');
      return;
    }

    const mailSyncProvider = this.mailSyncServiceFactory(account);
    await mailSyncProvider.syncAllFolders(account);
  }

  @OnEvent(SYNC_ACCOUNT_MESSAGES_EVENT)
  async syncAccountMessages(payload: { userId: string; accountId: string }) {
    const account = await this.accountService.getAccountById(
      payload.userId,
      payload.accountId,
    );
    if (!account) {
      console.log('Account not found');
      return;
    }

    const mailSyncProvider = this.mailSyncServiceFactory(account);
    await mailSyncProvider.syncAllMessages(account);
  }

  mailSyncServiceFactory(account: AccountEntity) {
    switch (account.metadata.type) {
      case AccountType.Microsoft:
        return this.microsoftAccountSyncService;
      default:
        throw new Error('Mail sync service not found');
    }
  }
}
