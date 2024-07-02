import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PayloadShape } from '../../common/types';
import { DatabaseService } from '../database/database.service';
import { MessageEntity } from './types';

@Injectable()
export class MessageService {
  constructor(private readonly database: DatabaseService) {}

  private getMessageIndexName(mailFolderId: string) {
    return `mail-message__${mailFolderId}`;
  }

  async getMessageByExternalId(mailFolderId: string, externalId: string) {
    const index = this.getMessageIndexName(mailFolderId);
    const mailMessages = await this.database.getDocumentList(MessageEntity, {
      index,
      query: { match: { externalId } },
    });
    if (mailMessages.count === 0) {
      return null;
    }
    return mailMessages.list[0];
  }

  async getMessageList(
    mailFolderId: string,
    paginate: { page: number; size: number },
  ) {
    const index = this.getMessageIndexName(mailFolderId);
    return await this.database.getDocumentList(MessageEntity, {
      index,
      paginate,
      sort: [{ createdDateTime: { order: 'desc' } }],
    });
  }

  async createMessage(
    mailFolderId: string,
    payload: PayloadShape<MessageEntity>,
  ) {
    const mailMessage = await this.getMessageByExternalId(
      mailFolderId,
      payload.externalId,
    );
    if (mailMessage) {
      throw new UnprocessableEntityException(
        'Mail message already exists with this externalId',
      );
    }

    const index = this.getMessageIndexName(mailFolderId);
    return await this.database.createDocument<MessageEntity>(index, payload);
  }

  async updateMessage(
    accountId: string,
    mailMessage: MessageEntity,
    updateFields: Partial<PayloadShape<MessageEntity>>,
  ) {
    const index = this.getMessageIndexName(accountId);
    return await this.database.updateDocument<MessageEntity>(
      index,
      mailMessage.id,
      updateFields,
    );
  }

  async deleteMessage(mailFolderId: string, id: string) {
    const index = this.getMessageIndexName(mailFolderId);
    await this.database.deleteDocument(index, id);
  }
}
