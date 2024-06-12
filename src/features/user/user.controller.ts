import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Request } from 'express';
import { createAccessToken } from '../../common/auth/access-token';
import { authorizeRequest } from '../../common/auth/authorization';
import { createHash, verifyHash } from '../../common/utils/hashing';
import { RegisterUserInput } from './inputs/register-user.input';
import { UserService } from './user.service';

@Controller('/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/register')
  async registerUser(@Body() input: RegisterUserInput) {
    const hashedPassword = createHash(input.password);
    const createdId = await this.userService.createUser({
      username: input.username.toLowerCase(),
      hashedPassword,
    });

    const accessToken = createAccessToken({ userId: createdId });
    return { accessToken };
  }

  @Post('/login')
  async loginUser(@Body() input: RegisterUserInput) {
    const user = await this.userService.getUserByUsername(input.username);
    if (!user) {
      throw new UnprocessableEntityException(
        'Username or password is incorrect',
      );
    }
    const isPasswordCorrect = verifyHash(input.password, user.hashedPassword);
    if (!isPasswordCorrect) {
      throw new UnprocessableEntityException(
        'Username or password is incorrect',
      );
    }

    const accessToken = createAccessToken({ userId: user.id });
    return { accessToken };
  }

  @Get('/self')
  async getSelfUser(@Req() req: Request) {
    const { userId } = authorizeRequest(req);
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UnprocessableEntityException('User not found');
    }
    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }

  @Get()
  async listUsers() {
    // TODO: Protect this endpoint with an admin check
    const users = await this.userService.listUsers();
    return {
      count: users.count,
      list: users.list.map((el) => ({
        id: el.id,
        username: el.username,
        createdAt: el.createdAt,
      })),
    };
  }
}
