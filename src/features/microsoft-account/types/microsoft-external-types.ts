export type MicrosoftExternalUser = {
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

export type MicrosoftExternalFolder = {
  id: string;
  displayName: string;
  parentFolderId: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  sizeInBytes: number;
  isHidden: boolean;
};

type MicrosoftExternalEmailObject = {
  emailAddress: {
    name: string;
    address: string;
  };
};

export type MicrosoftExternalMessage = {
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
  sender: MicrosoftExternalEmailObject;
  from: MicrosoftExternalEmailObject;
  toRecipients: MicrosoftExternalEmailObject[];
  ccRecipients: MicrosoftExternalEmailObject[];
  bccRecipients: MicrosoftExternalEmailObject[];
  replyTo: MicrosoftExternalEmailObject[];
  flag: { flagStatus: 'flagged' | 'notFlagged' };
};

export type MicrosoftExternalRemovedMessage = {
  id: string;
  '@removed': { reason: string };
};
