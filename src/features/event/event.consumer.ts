import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountService } from '../account/account.service';
import { AccountEntity, AccountType } from '../account/types';
import { FolderService } from '../folder/folder.service';
import { MessageService } from '../message/message.service';
import { MicrosoftAccountMailSyncService } from '../microsoft-account/microsoft-account-mail-sync.provider';
import {
  MARK_MESSAGE_AS_READ,
  SYNC_ACCOUNT_FOLDERS_EVENT,
  SYNC_ACCOUNT_MESSAGES_EVENT,
} from './constants';

@Injectable()
export class EventConsumer {
  constructor(
    private readonly accountService: AccountService,
    private readonly folderService: FolderService,
    private readonly messageService: MessageService,
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

  @OnEvent(MARK_MESSAGE_AS_READ)
  async markMessageAsRead({
    accountId,
    folderId,
    messageId,
    userId,
  }: {
    userId: string;
    accountId: string;
    folderId: string;
    messageId: string;
  }) {
    const [account, folder, message] = await Promise.all([
      this.accountService.getAccountById(userId, accountId),
      this.folderService.getFolderById(accountId, folderId),
      this.messageService.getMessageById(folderId, messageId),
    ]);
    if (!account) {
      console.log('Account not found');
      return;
    }
    if (!folder) {
      console.log('Mail folder not found');
      return;
    }
    if (!message) {
      console.log('Message not found');
      return;
    }

    const mailSyncProvider = this.mailSyncServiceFactory(account);
    await mailSyncProvider.markMessageAsRead({ account, folder, message });
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
