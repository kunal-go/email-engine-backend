export type MsGraphUser = {
  businessPhones: string[];
  displayName: string;
  givenName: string;
  jobTitle: string | null;
  mail: string;
  mobilePhone: string | null;
  officeLocation: string | null;
  preferredLanguage: string;
  surname: string;
  userPrincipalName: string;
  id: string;
};

export type MsGraphMailFolder = {
  id: string;
  displayName: string;
  parentFolderId: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  sizeInBytes: number;
  isHidden: boolean;
};

type MsGraphMessageEmailObject = {
  emailAddress: {
    name: string;
    address: string;
  };
};

export type MsGraphMessage = {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  changeKey: string;
  categories: [];
  receivedDateTime: string;
  sentDateTime: string;
  hasAttachments: boolean;
  internetMessageId: string;
  subject: string;
  bodyPreview: string;
  importance: string;
  parentFolderId: string;
  conversationId: string | null;
  conversationIndex: string | null;
  isDeliveryReceiptRequested: null;
  isReadReceiptRequested: boolean;
  isRead: boolean;
  isDraft: boolean;
  webLink: string;
  inferenceClassification: string;
  body: { contentType: string; content: string };
  sender: MsGraphMessageEmailObject;
  from: MsGraphMessageEmailObject;
  toRecipients: MsGraphMessageEmailObject[];
  ccRecipients: MsGraphMessageEmailObject[];
  bccRecipients: MsGraphMessageEmailObject[];
  replyTo: MsGraphMessageEmailObject[];
  flag: { flagStatus: 'flagged' | 'notFlagged' };
};

export type MsGraphRemovedMessage = {
  id: string;
  '@removed': { reason: string };
};
