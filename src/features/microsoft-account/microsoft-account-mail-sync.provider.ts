import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PayloadShape } from '../../common/types';
import { AccountEntity, IMailSyncService } from '../account/types';
import {
  SYNC_ACCOUNT_FOLDERS_EVENT,
  SYNC_ACCOUNT_MESSAGES_EVENT,
  USER_SSE_RESPONSE,
} from '../event/constants';
import { FolderService } from '../folder/folder.service';
import { FolderEntity } from '../folder/types';
import { MessageService } from '../message/message.service';
import { MessageEntity } from '../message/types';
import { MicrosoftExternalApiService } from './microsoft-external-api.service';
import {
  MicrosoftExternalFolder,
  MicrosoftExternalMessage,
  MicrosoftExternalRemovedMessage,
} from './types';

@Injectable()
export class MicrosoftAccountMailSyncService implements IMailSyncService {
  constructor(
    private readonly event: EventEmitter2,
    private readonly folderService: FolderService,
    private readonly messageService: MessageService,
    private readonly externalApiService: MicrosoftExternalApiService,
  ) {}

  async syncAllFolders(account: AccountEntity): Promise<void> {
    try {
      console.log(`Syncing folders of ${account.email} account from Microsoft`);

      const [localFolders, externalFolders] = await Promise.all([
        this.folderService.getFolderList(account.id),
        this.externalApiService.fetchFolderList({ account }),
      ]);

      const { createdItemCount, updatedItemCount } = await this.upsertFolders({
        accountId: account.id,
        externalFolders,
        localFolders: localFolders.list,
      });
      const { removedItemCount } = await this.removeFolders({
        accountId: account.id,
        externalFolders,
        localFolders: localFolders.list,
      });

      const hasAnyChanges =
        createdItemCount > 0 || updatedItemCount > 0 || removedItemCount > 0;
      if (hasAnyChanges) {
        console.log(
          `Folders synced of ${account.email} account from Microsoft : created(${createdItemCount}), updated(${updatedItemCount}), removed(${removedItemCount}).`,
        );
        this.event.emit(USER_SSE_RESPONSE + account.userId, {
          action: 'invalidate',
          type: 'mail-folder-list',
          payload: { accountId: account.id },
        });
      } else {
        console.log(
          `Folders synced of ${account.email} account from Microsoft with no changes to be applied`,
        );
      }

      this.event.emit(SYNC_ACCOUNT_MESSAGES_EVENT, {
        userId: account.userId,
        accountId: account.id,
      });
    } catch (err) {
      console.log(
        `Error while syncing folders of ${account.email} account from Microsoft`,
        err.message,
      );
    }
  }

  async syncAllMessages(account: AccountEntity): Promise<void> {
    console.log(`Syncing messages of ${account.email} account from Microsoft`);
    try {
      const localFolders = await this.folderService.getFolderList(account.id);
      if (localFolders.count === 0) {
        console.log('Skipping messages sync as no folders found.');
        return;
      }

      for (const folder of localFolders.list) {
        console.log('Syncing messages started of folder ', folder.name);
        await this.syncExternalMessagesInChunk({ account, folder });
        console.log('Messages synced of folder ', folder.name);
      }
      console.log('Messages are synced of account', account.email);
    } catch (err) {
      console.log(
        'Error while syncing messages of account',
        account.email,
        err.message,
      );
    }
  }

  async markMessageAsRead({
    account,
    folder,
    message,
  }: {
    account: AccountEntity;
    folder: FolderEntity;
    message: MessageEntity;
  }): Promise<void> {
    console.log(`Marking message as read of message ${message.id}`);
    try {
      await this.externalApiService.updateMessage({
        account,
        externalFolderId: folder.externalId,
        externalMessageId: message.externalId,
        update: { isRead: true },
      });
      console.log(`Message marked as read of message ${message.id}`);
      this.event.emit(SYNC_ACCOUNT_FOLDERS_EVENT, {
        userId: account.userId,
        accountId: account.id,
      });
    } catch (err) {
      console.log(
        `Error while marking message as read of message ${message.id}:`,
        err.message,
      );
    }
  }

  private async upsertFolders({
    accountId,
    externalFolders,
    localFolders,
  }: {
    accountId: string;
    externalFolders: MicrosoftExternalFolder[];
    localFolders: FolderEntity[];
  }) {
    let updatedItemCount = 0;
    let createdItemCount = 0;
    for (const externalFolder of externalFolders) {
      const foundLocalFolder = localFolders.find(
        (localFolder) => localFolder.externalId === externalFolder.id,
      );
      const payload: PayloadShape<FolderEntity> = {
        externalId: externalFolder.id,
        parentFolderId: externalFolder.parentFolderId,
        name: externalFolder.displayName,
        childFolderCount: externalFolder.childFolderCount,
        isHidden: externalFolder.isHidden,
        itemCount: externalFolder.totalItemCount,
        sizeInBytes: externalFolder.sizeInBytes,
        unreadItemCount: externalFolder.unreadItemCount,
        syncedItemCount: foundLocalFolder?.syncedItemCount || 0,
        lastSyncedAt: foundLocalFolder?.lastSyncedAt || null,
        skipToken: foundLocalFolder?.skipToken || null,
        deltaToken: foundLocalFolder?.deltaToken || null,
      };

      if (foundLocalFolder) {
        await this.folderService.updateFolder(
          accountId,
          foundLocalFolder.id,
          payload,
        );
        updatedItemCount++;
        continue;
      }
      await this.folderService.createFolder(accountId, payload);
      createdItemCount++;
    }

    return { updatedItemCount, createdItemCount };
  }

  private async removeFolders({
    accountId,
    externalFolders,
    localFolders,
  }: {
    accountId: string;
    externalFolders: MicrosoftExternalFolder[];
    localFolders: FolderEntity[];
  }) {
    const externalMailFolderIds = externalFolders.map(
      (externalMailFolder) => externalMailFolder.id,
    );
    const localMailFoldersToDeleteIds = localFolders.filter(
      (localMailFolder) =>
        !externalMailFolderIds.includes(localMailFolder.externalId),
    );
    for (const mailFolderToDelete of localMailFoldersToDeleteIds) {
      await this.folderService.deleteFolder(accountId, mailFolderToDelete.id);
    }
    const removedItemCount = localMailFoldersToDeleteIds.length;
    return { removedItemCount };
  }

  private async syncExternalMessagesInChunk({
    account,
    folder,
  }: {
    account: AccountEntity;
    folder: FolderEntity;
  }) {
    try {
      const { removedList, updatedList, deltaToken, skipToken } =
        await this.externalApiService.fetchDeltaMessageList({
          account,
          mailFolder: folder,
        });

      const { removedItemCount } = await this.removeMessages({
        folderId: folder.id,
        removedList,
      });
      const { createdItemCount, updatedItemCount } = await this.upsertMessages({
        folderId: folder.id,
        updatedExternalMessages: updatedList,
      });

      folder.deltaToken = deltaToken || null;
      folder.skipToken = skipToken || null;
      folder.syncedItemCount =
        folder.syncedItemCount + createdItemCount - removedItemCount;
      folder.lastSyncedAt = Date.now();
      await this.folderService.updateFolder(account.id, folder.id, folder);

      const hasAnyChanges =
        createdItemCount > 0 || updatedItemCount > 0 || removedItemCount > 0;
      if (hasAnyChanges) {
        console.log(
          `Messages synced in chunk of folder ${folder.name}: created: ${createdItemCount}, updated: ${updatedItemCount}, removed: ${removedItemCount} mail folders.`,
        );
        this.event.emit(USER_SSE_RESPONSE + account.userId, {
          action: 'invalidate',
          type: 'mail-message-list',
          payload: { mailFolderId: folder.id },
        });
      } else {
        console.log(
          `Messages synced in chunk of folder ${folder.name}: No changes found.`,
        );
      }

      if (folder.skipToken) {
        await this.syncExternalMessagesInChunk({
          account,
          folder: folder,
        });
      }
    } catch (err) {
      console.log(
        `Error while syncing mail messages of folder ${folder.name}:`,
        err.message,
      );
    }
  }

  private async removeMessages({
    folderId,
    removedList,
  }: {
    folderId: string;
    removedList: MicrosoftExternalRemovedMessage[];
  }) {
    let removedItemCount = 0;

    for (const externalDeltaRemovedMessage of removedList) {
      const mailMessage = await this.messageService.getMessageByExternalId(
        folderId,
        externalDeltaRemovedMessage.id,
      );
      if (mailMessage) {
        await this.messageService.deleteMessage(folderId, mailMessage.id);
        removedItemCount++;
      }
    }

    return { removedItemCount };
  }

  private async upsertMessages({
    folderId,
    updatedExternalMessages,
  }: {
    folderId: string;
    updatedExternalMessages: MicrosoftExternalMessage[];
  }) {
    let createdItemCount = 0;
    let updatedItemCount = 0;

    for (const externalMessage of updatedExternalMessages) {
      const localMessage = await this.messageService.getMessageByExternalId(
        folderId,
        externalMessage.id,
      );

      if (localMessage) {
        await this.updateLocalMessage({
          folderId,
          externalMessage,
          localMessage,
        });
        updatedItemCount++;
        continue;
      }

      await this.createLocalMessage({ folderId, externalMessage });
      createdItemCount++;
    }

    return { createdItemCount, updatedItemCount };
  }

  private async updateLocalMessage({
    folderId,
    localMessage,
    externalMessage,
  }: {
    folderId: string;
    localMessage: MessageEntity;
    externalMessage: MicrosoftExternalMessage;
  }) {
    const payload: Partial<PayloadShape<MessageEntity>> = {};
    if (externalMessage.createdDateTime !== undefined) {
      payload.createdDateTime = new Date(
        externalMessage.createdDateTime,
      ).getTime();
    }
    if (externalMessage.lastModifiedDateTime !== undefined) {
      payload.lastModifiedDateTime = new Date(
        externalMessage.lastModifiedDateTime,
      ).getTime();
    }
    if (externalMessage.receivedDateTime !== undefined) {
      payload.receivedDateTime = new Date(
        externalMessage.receivedDateTime,
      ).getTime();
    }
    if (externalMessage.sentDateTime !== undefined) {
      payload.sentDateTime = new Date(externalMessage.sentDateTime).getTime();
    }
    if (externalMessage.hasAttachments !== undefined) {
      payload.hasAttachments = externalMessage.hasAttachments;
    }
    if (externalMessage.internetMessageId !== undefined) {
      payload.internetMessageId = externalMessage.internetMessageId;
    }
    if (externalMessage.subject !== undefined) {
      payload.subject = externalMessage.subject;
    }
    if (externalMessage.bodyPreview !== undefined) {
      payload.bodyPreview = externalMessage.bodyPreview;
    }
    if (externalMessage.conversationId !== undefined) {
      payload.conversationId = externalMessage.conversationId;
    }
    if (externalMessage.isRead !== undefined) {
      payload.isRead = externalMessage.isRead;
    }
    if (externalMessage.isDraft !== undefined) {
      payload.isDraft = externalMessage.isDraft;
    }
    if (externalMessage.webLink !== undefined) {
      payload.webLink = externalMessage.webLink;
    }
    if (externalMessage.body !== undefined) {
      payload.body = externalMessage.body;
    }
    if (externalMessage.sender !== undefined) {
      payload.sender = externalMessage.sender.emailAddress;
    }
    if (externalMessage.from !== undefined) {
      payload.from = externalMessage.from.emailAddress;
    }
    if (externalMessage.toRecipients !== undefined) {
      payload.toRecipients = externalMessage.toRecipients.map(
        (el) => el.emailAddress,
      );
    }
    if (externalMessage.ccRecipients !== undefined) {
      payload.ccRecipients = externalMessage.ccRecipients.map(
        (el) => el.emailAddress,
      );
    }
    if (externalMessage.bccRecipients !== undefined) {
      payload.bccRecipients = externalMessage.bccRecipients.map(
        (el) => el.emailAddress,
      );
    }
    if (externalMessage.replyTo !== undefined) {
      payload.replyTo = externalMessage.replyTo.map((el) => el.emailAddress);
    }
    if (externalMessage.flag !== undefined) {
      payload.isFlagged = externalMessage.flag.flagStatus === 'flagged';
    }
    payload.lastSyncedAt = Date.now();

    await this.messageService.updateMessage(folderId, localMessage, payload);
  }

  private async createLocalMessage({
    externalMessage,
    folderId,
  }: {
    folderId: string;
    externalMessage: MicrosoftExternalMessage;
  }) {
    const payload: PayloadShape<MessageEntity> = {
      externalId: externalMessage.id,
      createdDateTime: new Date(externalMessage.createdDateTime).getTime(),
      lastModifiedDateTime: new Date(
        externalMessage.lastModifiedDateTime,
      ).getTime(),
      receivedDateTime: new Date(externalMessage.receivedDateTime).getTime(),
      sentDateTime: new Date(externalMessage.sentDateTime).getTime(),
      hasAttachments: externalMessage.hasAttachments,
      internetMessageId: externalMessage.internetMessageId,
      subject: externalMessage.subject,
      bodyPreview: externalMessage.bodyPreview,
      conversationId: externalMessage.conversationId,
      isRead: externalMessage.isRead,
      isDraft: externalMessage.isDraft,
      webLink: externalMessage.webLink,
      body: externalMessage.body,
      sender: externalMessage.sender.emailAddress,
      from: externalMessage.from.emailAddress,
      toRecipients: externalMessage.toRecipients.map((el) => el.emailAddress),
      ccRecipients: externalMessage.ccRecipients.map((el) => el.emailAddress),
      bccRecipients: externalMessage.bccRecipients.map((el) => el.emailAddress),
      replyTo: externalMessage.replyTo.map((el) => el.emailAddress),
      isFlagged: externalMessage.flag.flagStatus === 'flagged',
      lastSyncedAt: Date.now(),
    };
    await this.messageService.createMessage(folderId, payload);
  }
}
