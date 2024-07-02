import { BaseEntity } from '../../../common/base-entity';
import { PayloadShape } from '../../../common/types';

export enum AccountType {
  Microsoft = 'Microsoft',
}

type AccountEntityMetadata = {
  type: AccountType.Microsoft;
  externalId: string;
  refreshToken: string;
  accessToken: string;
};

export class AccountEntity extends BaseEntity {
  email: string;
  name: string;
  createdAt: number;
  metadata: AccountEntityMetadata;

  get userId() {
    return this.index.split('__')[1];
  }

  constructor(index: string, id: string, data: PayloadShape<AccountEntity>) {
    super(id, index);
    this.email = data.email;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.metadata = data.metadata;
  }
}
