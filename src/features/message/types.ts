import { BaseEntity } from '../../common/base-entity';
import { PayloadShape } from '../../common/types';

type MessageEmailObject = {
  name: string;
  address: string;
};

export class MessageEntity extends BaseEntity {
  externalId: string;
  createdDateTime: number;
  lastModifiedDateTime: number;
  receivedDateTime: number;
  sentDateTime: number;
  hasAttachments: boolean;
  internetMessageId: string;
  subject: string;
  bodyPreview: string;
  conversationId: string | null;
  isRead: boolean;
  isDraft: boolean;
  webLink: string;
  body: { contentType: string; content: string };
  sender: MessageEmailObject;
  from: MessageEmailObject;
  toRecipients: MessageEmailObject[];
  ccRecipients: MessageEmailObject[];
  bccRecipients: MessageEmailObject[];
  replyTo: MessageEmailObject[];
  isFlagged: boolean;
  lastSyncedAt: number;

  get folderId() {
    return this.index.split('__')[1];
  }

  constructor(index: string, id: string, data: PayloadShape<MessageEntity>) {
    super(id, index);
    this.externalId = data.externalId;
    this.createdDateTime = data.createdDateTime;
    this.lastModifiedDateTime = data.lastModifiedDateTime;
    this.receivedDateTime = data.receivedDateTime;
    this.sentDateTime = data.sentDateTime;
    this.hasAttachments = data.hasAttachments;
    this.internetMessageId = data.internetMessageId;
    this.subject = data.subject;
    this.bodyPreview = data.bodyPreview;
    this.conversationId = data.conversationId;
    this.isRead = data.isRead;
    this.isDraft = data.isDraft;
    this.webLink = data.webLink;
    this.body = data.body;
    this.sender = data.sender;
    this.from = data.from;
    this.toRecipients = data.toRecipients;
    this.ccRecipients = data.ccRecipients;
    this.bccRecipients = data.bccRecipients;
    this.replyTo = data.replyTo;
    this.isFlagged = false;
  }
}
