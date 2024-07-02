import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PayloadShape } from '../../common/types';
import { DatabaseService } from '../database/database.service';
import { FolderEntity } from './types';

@Injectable()
export class FolderService {
  constructor(private readonly database: DatabaseService) {}

  private getFolderIndexName(accountId: string) {
    return `mail-folder__${accountId}`;
  }

  async getFolderById(accountId: string, id: string) {
    const index = this.getFolderIndexName(accountId);
    const mailFolder = await this.database.getDocumentList(FolderEntity, {
      index,
      query: { ids: { values: [id] } },
    });
    if (mailFolder.count === 0) {
      return null;
    }
    return mailFolder.list[0];
  }

  async getFolderByExternalId(accountId: string, externalId: string) {
    const index = this.getFolderIndexName(accountId);
    const mailFolder = await this.database.getDocumentList(FolderEntity, {
      index,
      query: { match: { externalId } },
    });
    if (mailFolder.count === 0) {
      return null;
    }
    return mailFolder.list[0];
  }

  async getFolderList(accountId: string) {
    const index = this.getFolderIndexName(accountId);
    return await this.database.getDocumentList(FolderEntity, {
      index,
    });
  }

  async createFolder(accountId: string, payload: PayloadShape<FolderEntity>) {
    const mailFolder = await this.getFolderByExternalId(
      accountId,
      payload.externalId,
    );
    if (mailFolder) {
      throw new UnprocessableEntityException(
        'Folder already exists with this externalId',
      );
    }

    const index = this.getFolderIndexName(accountId);
    return await this.database.createDocument(index, payload);
  }

  async updateFolder(
    accountId: string,
    mailFolderId: string,
    payload: PayloadShape<FolderEntity>,
  ) {
    const index = this.getFolderIndexName(accountId);
    return await this.database.updateDocument(index, mailFolderId, payload);
  }

  async deleteFolder(accountId: string, mailFolderId: string) {
    // Delete all messages in the folder
    await this.database.deleteIndex('mail-message__' + mailFolderId);

    const index = this.getFolderIndexName(accountId);
    await this.database.deleteDocument(index, mailFolderId);
  }
}
