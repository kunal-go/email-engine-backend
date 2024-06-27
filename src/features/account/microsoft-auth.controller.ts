import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { authorizeRequest } from '../../common/auth/authorization';
import { SYNC_ACCOUNT_MAIL_FOLDERS } from '../../common/events';
import { Configuration } from '../../configuration';
import { AccountService } from './account.service';
import { LinkMicrosoftAccountInput } from './inputs/link-microsoft-account.input';

@Controller('/account/microsoft-auth')
export class MicrosoftAuthController {
  constructor(
    private readonly config: ConfigService<Configuration>,
    private readonly accountService: AccountService,
    private readonly eventEmitter: EventEmitter2,
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
    const { userId } = authorizeRequest(req);
    const createdId = await this.accountService.createAccountWithMicrosoftAuth({
      userId,
      authorizationCode: input.authorizationCode,
    });

    this.eventEmitter.emit(SYNC_ACCOUNT_MAIL_FOLDERS, {
      userId,
      accountId: createdId,
    });
    return { createdId };
  }
}
