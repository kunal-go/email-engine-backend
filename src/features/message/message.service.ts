import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PayloadShape } from '../../common/types';
import { DatabaseService } from '../database/database.service';
import { MessageEntity } from './types';

@Injectable()
export class MessageService {
  constructor(private readonly database: DatabaseService) {}

  private getMessageIndexName(folderId: string) {
    return `mail-message__${folderId}`;
  }

  async getMessageById(folderId: string, id: string) {
    const index = this.getMessageIndexName(folderId);
    const message = await this.database.getDocumentList(MessageEntity, {
      index,
      query: { ids: { values: [id] } },
    });
    if (message.count === 0) {
      return null;
    }
    return message.list[0];
  }

  async getMessageByExternalId(folderId: string, externalId: string) {
    const index = this.getMessageIndexName(folderId);
    const message = await this.database.getDocumentList(MessageEntity, {
      index,
      query: { match: { externalId } },
    });
    if (message.count === 0) {
      return null;
    }
    return message.list[0];
  }

  async getMessageList(
    folderId: string,
    paginate: { page: number; size: number },
  ) {
    const index = this.getMessageIndexName(folderId);
    return await this.database.getDocumentList(MessageEntity, {
      index,
      paginate,
      sort: [{ createdDateTime: { order: 'desc' } }],
    });
  }

  async createMessage(folderId: string, payload: PayloadShape<MessageEntity>) {
    const message = await this.getMessageByExternalId(
      folderId,
      payload.externalId,
    );
    if (message) {
      throw new UnprocessableEntityException(
        'Mail message already exists with this externalId',
      );
    }

    const index = this.getMessageIndexName(folderId);
    return await this.database.createDocument<MessageEntity>(index, payload);
  }

  async updateMessage(
    accountId: string,
    message: MessageEntity,
    updateFields: Partial<PayloadShape<MessageEntity>>,
  ) {
    const index = this.getMessageIndexName(accountId);
    return await this.database.updateDocument<MessageEntity>(
      index,
      message.id,
      updateFields,
    );
  }

  async deleteMessage(folderId: string, id: string) {
    const index = this.getMessageIndexName(folderId);
    await this.database.deleteDocument(index, id);
  }
}
