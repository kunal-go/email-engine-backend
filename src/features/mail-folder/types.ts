import { BaseEntity } from '../../common/base-entity';
import { PayloadShape } from '../../common/types';

export class MailFolderEntity extends BaseEntity {
  externalId: string;
  name: string;
  parentFolderId: string;
  itemCount: number;
  unreadItemCount: number;
  childFolderCount: number;
  sizeInBytes: number;
  isHidden: boolean;
  syncedItemCount: number;
  lastedSyncedAt: number | null;
  skipToken: string | null;
  deltaToken: string | null;

  get accountId() {
    return this.index.split('-')[1];
  }

  constructor(index: string, id: string, data: PayloadShape<MailFolderEntity>) {
    super(id, index);
    this.externalId = data.externalId;
    this.name = data.name;
    this.parentFolderId = data.parentFolderId;
    this.itemCount = data.itemCount;
    this.unreadItemCount = data.unreadItemCount;
    this.childFolderCount = data.childFolderCount;
    this.sizeInBytes = data.sizeInBytes;
    this.isHidden = data.isHidden;
    this.syncedItemCount = data.syncedItemCount;
    this.lastedSyncedAt = data.lastedSyncedAt;
    this.skipToken = data.skipToken;
    this.deltaToken = data.deltaToken;
  }
}
