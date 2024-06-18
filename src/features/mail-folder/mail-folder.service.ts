import {
  Inject,
  Injectable,
  UnprocessableEntityException,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  SYNC_ACCOUNT_MAIL_FOLDERS,
  SYNC_ACCOUNT_MAIL_MESSAGES,
} from '../../common/events';
import { PayloadShape } from '../../common/types';
import { ElasticSearchProviderService } from '../../providers/elastic-search-provider/elastic-search-provider.service';
import { MsGraphApiProviderService } from '../../providers/ms-graph-api-provider/ms-graph-api-provider.service';
import { AccountService } from '../account/account.service';
import { MailFolderEntity } from './types';

@Injectable()
export class MailFolderService {
  constructor(
    private readonly elasticSearchProvider: ElasticSearchProviderService,
    @Inject(forwardRef(() => MsGraphApiProviderService))
    private readonly msGraphApiProvider: MsGraphApiProviderService,
    @Inject(forwardRef(() => AccountService))
    private readonly accountService: AccountService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private getMailFolderIndexName(accountId: string) {
    return `mail-folder__${accountId}`;
  }

  async getMailFolderById(accountId: string, id: string) {
    const index = this.getMailFolderIndexName(accountId);
    const mailFolder = await this.elasticSearchProvider.listDocuments(
      MailFolderEntity,
      { index, query: { ids: { values: [id] } } },
    );
    if (mailFolder.count === 0) {
      return null;
    }
    return mailFolder.list[0];
  }

  async getMailFolderByExternalId(accountId: string, externalId: string) {
    const index = this.getMailFolderIndexName(accountId);
    const mailFolder = await this.elasticSearchProvider.listDocuments(
      MailFolderEntity,
      { index, query: { match: { externalId } } },
    );
    if (mailFolder.count === 0) {
      return null;
    }
    return mailFolder.list[0];
  }

  async listMailFolders(accountId: string) {
    const index = this.getMailFolderIndexName(accountId);
    return await this.elasticSearchProvider.listDocuments(MailFolderEntity, {
      index,
    });
  }

  async createMailFolder(
    accountId: string,
    payload: PayloadShape<MailFolderEntity>,
  ) {
    const mailFolder = await this.getMailFolderByExternalId(
      accountId,
      payload.externalId,
    );
    if (mailFolder) {
      throw new UnprocessableEntityException(
        'Mail folder already exists with this externalId',
      );
    }

    const index = this.getMailFolderIndexName(accountId);
    return await this.elasticSearchProvider.createDocument(index, payload);
  }

  async updateMailFolder(
    accountId: string,
    mailFolderId: string,
    payload: PayloadShape<MailFolderEntity>,
  ) {
    const index = this.getMailFolderIndexName(accountId);
    return await this.elasticSearchProvider.updateDocument(
      index,
      mailFolderId,
      payload,
    );
  }

  async deleteMailFolder(accountId: string, mailFolderId: string) {
    // Delete all mail messages in this mail folder
    await this.elasticSearchProvider.deleteIndex(
      'mail-message__' + mailFolderId,
    );

    const index = this.getMailFolderIndexName(accountId);
    await this.elasticSearchProvider.deleteDocument(index, mailFolderId);
  }

  @OnEvent(SYNC_ACCOUNT_MAIL_FOLDERS)
  async syncExternalMailFoldersIntoLocal({
    accountId,
    userId,
  }: {
    userId: string;
    accountId: string;
  }) {
    try {
      console.log('Syncing mail folders of account:', accountId);

      const account = await this.accountService.getAccountById(
        userId,
        accountId,
      );
      if (!account) {
        return;
      }

      const localMailFolders = await this.listMailFolders(accountId);
      const externalMailFolders = await this.msGraphApiProvider.listMailFolders(
        { account },
      );
      console.log(`Found ${externalMailFolders.length} mail folders.`);

      let updatedItemCount = 0;
      let createdItemCount = 0;
      for (const externalMailFolder of externalMailFolders) {
        const localMailFolder = localMailFolders.list.find(
          (localMailFolder) =>
            localMailFolder.externalId === externalMailFolder.id,
        );
        const payload: PayloadShape<MailFolderEntity> = {
          externalId: externalMailFolder.id,
          parentFolderId: externalMailFolder.parentFolderId,
          name: externalMailFolder.displayName,
          childFolderCount: externalMailFolder.childFolderCount,
          isHidden: externalMailFolder.isHidden,
          itemCount: externalMailFolder.totalItemCount,
          sizeInBytes: externalMailFolder.sizeInBytes,
          unreadItemCount: externalMailFolder.unreadItemCount,
          syncedItemCount: localMailFolder?.syncedItemCount || 0,
          lastSyncedAt: localMailFolder?.lastSyncedAt || null,
          skipToken: localMailFolder?.skipToken || null,
          deltaToken: localMailFolder?.deltaToken || null,
        };

        if (localMailFolder) {
          await this.updateMailFolder(accountId, localMailFolder.id, payload);
          updatedItemCount++;
          continue;
        }
        await this.createMailFolder(accountId, payload);
        createdItemCount++;
      }

      const externalMailFolderIds = externalMailFolders.map(
        (externalMailFolder) => externalMailFolder.id,
      );
      const localMailFoldersToDeleteIds = localMailFolders.list.filter(
        (localMailFolder) =>
          !externalMailFolderIds.includes(localMailFolder.externalId),
      );
      for (const mailFolderToDelete of localMailFoldersToDeleteIds) {
        await this.deleteMailFolder(accountId, mailFolderToDelete.id);
      }
      const removedItemCount = localMailFoldersToDeleteIds.length;

      console.log(
        `Mail folders sync completed: created: ${createdItemCount}, updated: ${updatedItemCount}, removed: ${removedItemCount} mail folders.`,
      );

      this.eventEmitter.emit(SYNC_ACCOUNT_MAIL_MESSAGES, {
        userId,
        accountId,
      });
    } catch (err) {
      console.log('Error while syncing mail folders:', err.message);
    }
  }
}
