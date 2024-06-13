import { BaseEntity } from '../../common/base-entity';

export class UserEntity extends BaseEntity {
  username: string;
  hashedPassword: string;
  createdAt: number;

  constructor(
    index: string,
    id: string,
    data: Omit<UserEntity, keyof BaseEntity>,
  ) {
    super(id, index);
    this.username = data.username;
    this.hashedPassword = data.hashedPassword;
    this.createdAt = data.createdAt;
  }
}
