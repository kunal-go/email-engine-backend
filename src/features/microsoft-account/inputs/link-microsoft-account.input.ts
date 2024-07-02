import { IsNotEmpty } from 'class-validator';

export class LinkMicrosoftAccountInput {
  @IsNotEmpty()
  authorizationCode: string;
}
