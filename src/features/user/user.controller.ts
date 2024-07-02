import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Sse,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import {
  createAccessToken,
  validateAccessToken,
} from '../../common/auth/access-token';
import { authorizeRequest } from '../../common/auth/authorization';
import { createHash, verifyHash } from '../../common/utils/hashing';
import { USER_SSE_RESPONSE } from '../event/constants';
import { RegisterUserInput } from './inputs/register-user.input';
import { UserService } from './user.service';

@Controller('/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
  async getUserList() {
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

  @Sse('sse')
  async accountSse(@Query('accessToken') accessToken: string) {
    const { userId } = validateAccessToken(accessToken);
    const observable = new Observable((subscribe) => {
      this.eventEmitter.on(USER_SSE_RESPONSE + userId, (data) => {
        subscribe.next(data);
      });
    });
    return observable.pipe(map((data) => ({ data })));
  }
}
