export enum AccountType {
  Microsoft = 'Microsoft',
}

export type AccountEntity = {
  id: string;
  type: AccountType;
  externalId: string;
  email: string;
  name: string;
  label: string;
  createdAt: number;
  accessToken: string;
  refreshToken: string;
};
