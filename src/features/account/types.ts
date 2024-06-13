import { BaseEntity } from '../../common/base-entity';
import { PayloadShape } from '../../common/types';

export enum AccountType {
  Microsoft = 'Microsoft',
}

export class AccountEntity extends BaseEntity {
  type: AccountType;
  externalId: string;
  email: string;
  name: string;
  label: string;
  createdAt: number;
  accessToken: string;
  refreshToken: string;

  get userId() {
    return this.index.split('__')[1];
  }

  constructor(index: string, id: string, data: PayloadShape<AccountEntity>) {
    super(id, index);
    this.type = data.type;
    this.externalId = data.externalId;
    this.email = data.email;
    this.name = data.name;
    this.label = data.label;
    this.createdAt = data.createdAt;
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
  }
}
