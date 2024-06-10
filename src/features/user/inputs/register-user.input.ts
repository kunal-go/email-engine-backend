import { IsNotEmpty } from 'class-validator';

export class RegisterUserInput {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;
}
