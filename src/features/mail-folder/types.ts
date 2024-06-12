export type MailFolderEntity = {
  id: string;
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
};
