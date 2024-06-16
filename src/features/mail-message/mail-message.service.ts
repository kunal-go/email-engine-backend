import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SYNC_ACCOUNT_MAIL_MESSAGES } from '../../common/events';
import { PayloadShape } from '../../common/types';
import { ElasticSearchProviderService } from '../../providers/elastic-search-provider/elastic-search-provider.service';
import { MsGraphApiProviderService } from '../../providers/ms-graph-api-provider/ms-graph-api-provider.service';
import { AccountService } from '../account/account.service';
import { AccountEntity } from '../account/types';
import { MailFolderService } from '../mail-folder/mail-folder.service';
import { MailFolderEntity } from '../mail-folder/types';
import { MailMessageEntity } from './types';

@Injectable()
export class MailMessageService {
  constructor(
    private readonly elasticSearchProvider: ElasticSearchProviderService,
    private readonly msGraphApiProvider: MsGraphApiProviderService,
    private readonly mailFolderService: MailFolderService,
    private readonly accountService: AccountService,
  ) {}

  private getMailMessageIndexName(mailFolderId: string) {
    return `mail-message__${mailFolderId}`;
  }

  async getMailMessageByExternalId(mailFolderId: string, externalId: string) {
    const index = this.getMailMessageIndexName(mailFolderId);
    const mailMessages = await this.elasticSearchProvider.listDocuments(
      MailMessageEntity,
      index,
      { match: { externalId } },
    );
    if (mailMessages.count === 0) {
      return null;
    }
    return mailMessages.list[0];
  }

  async listMailMessages(mailFolderId: string) {
    const index = this.getMailMessageIndexName(mailFolderId);
    return await this.elasticSearchProvider.listDocuments(
      MailMessageEntity,
      index,
    );
  }

  async createMailMessage(
    mailFolderId: string,
    payload: PayloadShape<MailMessageEntity>,
  ) {
    const mailMessage = await this.getMailMessageByExternalId(
      mailFolderId,
      payload.externalId,
    );
    if (mailMessage) {
      throw new UnprocessableEntityException(
        'Mail message already exists with this externalId',
      );
    }

    const index = this.getMailMessageIndexName(mailFolderId);
    return await this.elasticSearchProvider.createDocument<MailMessageEntity>(
      index,
      payload,
    );
  }

  async updateMailMessage(
    accountId: string,
    mailMessage: MailMessageEntity,
    updateFields: Partial<PayloadShape<MailMessageEntity>>,
  ) {
    const index = this.getMailMessageIndexName(accountId);
    return await this.elasticSearchProvider.updateDocument<MailMessageEntity>(
      index,
      mailMessage.id,
      updateFields,
    );
  }

  async deleteMailMessage(mailFolderId: string, id: string) {
    const index = this.getMailMessageIndexName(mailFolderId);
    await this.elasticSearchProvider.deleteDocument(index, id);
  }

  @OnEvent(SYNC_ACCOUNT_MAIL_MESSAGES)
  async syncMessagesOfAllMailFolders({
    accountId,
    userId,
  }: {
    userId: string;
    accountId: string;
  }) {
    try {
      const account = await this.accountService.getAccountById(
        userId,
        accountId,
      );
      if (!account) {
        console.log('Skipping mail messages sync as no account found.');
        return;
      }

      const localMailFolders =
        await this.mailFolderService.listMailFolders(accountId);
      for (const mailFolder of localMailFolders.list) {
        console.log(
          'Mail messages syncing started for folder:',
          mailFolder.name,
        );
        await this.syncExternalMailMessagesInChunkIntoLocal({
          account,
          mailFolder,
        });
        console.log(
          'Mail messages syncing completed for folder:',
          mailFolder.name,
        );
      }
      console.log(
        'All mail messages are synced for all mail folders of account.',
      );
    } catch (err) {
      console.log(
        'Error while syncing messages for all mail folders:',
        err.message,
      );
    }
  }

  async syncExternalMailMessagesInChunkIntoLocal({
    account,
    mailFolder,
  }: {
    account: AccountEntity;
    mailFolder: MailFolderEntity;
  }) {
    try {
      const { removedList, updatedList, deltaToken, skipToken } =
        await this.msGraphApiProvider.getDeltaMessages({
          account,
          mailFolder,
        });

      let createdItemCount = 0;
      let updatedItemCount = 0;
      let removedItemCount = 0;

      for (const externalDeltaRemovedMessage of removedList) {
        const mailMessage = await this.getMailMessageByExternalId(
          mailFolder.id,
          externalDeltaRemovedMessage.id,
        );
        if (mailMessage) {
          await this.deleteMailMessage(mailFolder.id, mailMessage.id);
          removedItemCount++;
        }
      }

      for (const externalDeltaMailMessage of updatedList) {
        const mailMessage = await this.getMailMessageByExternalId(
          mailFolder.id,
          externalDeltaMailMessage.id,
        );

        if (mailMessage) {
          const payload: Partial<PayloadShape<MailMessageEntity>> = {};
          if (externalDeltaMailMessage.createdDateTime !== undefined) {
            payload.createdDateTime = new Date(
              externalDeltaMailMessage.createdDateTime,
            ).getTime();
          }
          if (externalDeltaMailMessage.lastModifiedDateTime !== undefined) {
            payload.lastModifiedDateTime = new Date(
              externalDeltaMailMessage.lastModifiedDateTime,
            ).getTime();
          }
          if (externalDeltaMailMessage.receivedDateTime !== undefined) {
            payload.receivedDateTime = new Date(
              externalDeltaMailMessage.receivedDateTime,
            ).getTime();
          }
          if (externalDeltaMailMessage.sentDateTime !== undefined) {
            payload.sentDateTime = new Date(
              externalDeltaMailMessage.sentDateTime,
            ).getTime();
          }
          if (externalDeltaMailMessage.hasAttachments !== undefined) {
            payload.hasAttachments = externalDeltaMailMessage.hasAttachments;
          }
          if (externalDeltaMailMessage.internetMessageId !== undefined) {
            payload.internetMessageId =
              externalDeltaMailMessage.internetMessageId;
          }
          if (externalDeltaMailMessage.subject !== undefined) {
            payload.subject = externalDeltaMailMessage.subject;
          }
          if (externalDeltaMailMessage.bodyPreview !== undefined) {
            payload.bodyPreview = externalDeltaMailMessage.bodyPreview;
          }
          if (externalDeltaMailMessage.conversationId !== undefined) {
            payload.conversationId = externalDeltaMailMessage.conversationId;
          }
          if (externalDeltaMailMessage.isRead !== undefined) {
            payload.isRead = externalDeltaMailMessage.isRead;
          }
          if (externalDeltaMailMessage.isDraft !== undefined) {
            payload.isDraft = externalDeltaMailMessage.isDraft;
          }
          if (externalDeltaMailMessage.webLink !== undefined) {
            payload.webLink = externalDeltaMailMessage.webLink;
          }
          if (externalDeltaMailMessage.body !== undefined) {
            payload.body = externalDeltaMailMessage.body;
          }
          if (externalDeltaMailMessage.sender !== undefined) {
            payload.sender = externalDeltaMailMessage.sender.emailAddress;
          }
          if (externalDeltaMailMessage.from !== undefined) {
            payload.from = externalDeltaMailMessage.from.emailAddress;
          }
          if (externalDeltaMailMessage.toRecipients !== undefined) {
            payload.toRecipients = externalDeltaMailMessage.toRecipients.map(
              (el) => el.emailAddress,
            );
          }
          if (externalDeltaMailMessage.ccRecipients !== undefined) {
            payload.ccRecipients = externalDeltaMailMessage.ccRecipients.map(
              (el) => el.emailAddress,
            );
          }
          if (externalDeltaMailMessage.bccRecipients !== undefined) {
            payload.bccRecipients = externalDeltaMailMessage.bccRecipients.map(
              (el) => el.emailAddress,
            );
          }
          if (externalDeltaMailMessage.replyTo !== undefined) {
            payload.replyTo = externalDeltaMailMessage.replyTo.map(
              (el) => el.emailAddress,
            );
          }
          if (externalDeltaMailMessage.flag !== undefined) {
            payload.isFlagged =
              externalDeltaMailMessage.flag.flagStatus === 'flagged';
          }
          payload.lastSyncedAt = Date.now();

          await this.updateMailMessage(mailFolder.id, mailMessage, payload);
          updatedItemCount++;
          continue;
        }

        const payload: PayloadShape<MailMessageEntity> = {
          externalId: externalDeltaMailMessage.id,
          createdDateTime: new Date(
            externalDeltaMailMessage.createdDateTime,
          ).getTime(),
          lastModifiedDateTime: new Date(
            externalDeltaMailMessage.lastModifiedDateTime,
          ).getTime(),
          receivedDateTime: new Date(
            externalDeltaMailMessage.receivedDateTime,
          ).getTime(),
          sentDateTime: new Date(
            externalDeltaMailMessage.sentDateTime,
          ).getTime(),
          hasAttachments: externalDeltaMailMessage.hasAttachments,
          internetMessageId: externalDeltaMailMessage.internetMessageId,
          subject: externalDeltaMailMessage.subject,
          bodyPreview: externalDeltaMailMessage.bodyPreview,
          conversationId: externalDeltaMailMessage.conversationId,
          isRead: externalDeltaMailMessage.isRead,
          isDraft: externalDeltaMailMessage.isDraft,
          webLink: externalDeltaMailMessage.webLink,
          body: externalDeltaMailMessage.body,
          sender: externalDeltaMailMessage.sender.emailAddress,
          from: externalDeltaMailMessage.from.emailAddress,
          toRecipients: externalDeltaMailMessage.toRecipients.map(
            (el) => el.emailAddress,
          ),
          ccRecipients: externalDeltaMailMessage.ccRecipients.map(
            (el) => el.emailAddress,
          ),
          bccRecipients: externalDeltaMailMessage.bccRecipients.map(
            (el) => el.emailAddress,
          ),
          replyTo: externalDeltaMailMessage.replyTo.map(
            (el) => el.emailAddress,
          ),
          isFlagged: externalDeltaMailMessage.flag.flagStatus === 'flagged',
          lastSyncedAt: Date.now(),
        };
        await this.createMailMessage(mailFolder.id, payload);
        createdItemCount++;
      }

      mailFolder.deltaToken = deltaToken || null;
      mailFolder.skipToken = skipToken || null;
      mailFolder.syncedItemCount =
        mailFolder.syncedItemCount + createdItemCount - removedItemCount;
      mailFolder.lastSyncedAt = Date.now();

      await this.mailFolderService.updateMailFolder(
        account.id,
        mailFolder.id,
        mailFolder,
      );

      console.log(
        `Mail messages chunk sync completed of folder ${mailFolder.name}: created: ${createdItemCount}, updated: ${updatedItemCount}, removed: ${removedItemCount} mail folders.`,
      );

      if (mailFolder.skipToken) {
        await this.syncExternalMailMessagesInChunkIntoLocal({
          account,
          mailFolder,
        });
      }
    } catch (err) {
      console.log(
        `Error while syncing mail messages of folder ${mailFolder.name}:`,
        err.message,
      );
    }
  }
}
