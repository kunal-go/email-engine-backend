import { Injectable } from '@nestjs/common';
import { AccountEntity } from './account-entity';
import { MessageEntity } from '../../message/types';

@Injectable()
export abstract class IMailSyncService {
  abstract syncAllFolders(account: AccountEntity): Promise<void>;
  abstract syncAllMessages(account: AccountEntity): Promise<void>;
  abstract markMessageAsRead(payload: {
    account: AccountEntity;
    message: MessageEntity;
  }): Promise<void>;
}
