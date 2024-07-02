import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { authorizeRequest } from '../../common/auth/authorization';
import { Configuration } from '../../configuration';
import { SYNC_ACCOUNT_FOLDERS_EVENT } from '../event/constants';
import { UserService } from '../user/user.service';
import { LinkMicrosoftAccountInput } from './inputs/link-microsoft-account.input';
import { MicrosoftAccountService } from './microsoft-account.service';

@Controller('/account/microsoft-auth')
export class MicrosoftAccountController {
  constructor(
    private readonly config: ConfigService<Configuration>,
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UserService,
    private readonly microsoftAccountService: MicrosoftAccountService,
  ) {}

  @Get('/url')
  async getMicrosoftAuthUrl(@Req() req: Request) {
    authorizeRequest(req);

    const tenantId = this.config.get('MS_GRAPH_TENANT_ID');
    const clientId = this.config.get('MS_GRAPH_CLIENT_ID');
    return {
      url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&scope=.default&response_type=code`,
    };
  }

  @Post('/link')
  async linkMicrosoftAccount(
    @Req() req: Request,
    @Body() input: LinkMicrosoftAccountInput,
  ) {
    const { authorizationCode } = input;
    const { userId } = authorizeRequest(req);
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UnprocessableEntityException('User does not exist');
    }

    const createdId = await this.microsoftAccountService.linkMicrosoftAccount({
      user,
      authorizationCode,
    });
    this.eventEmitter.emit(SYNC_ACCOUNT_FOLDERS_EVENT, {
      userId,
      accountId: createdId,
    });
    return { createdId };
  }
}
