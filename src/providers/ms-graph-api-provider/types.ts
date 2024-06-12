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
