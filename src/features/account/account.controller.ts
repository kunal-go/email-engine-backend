import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { authorizeRequest } from '../../common/auth/authorization';
import { Configuration } from '../../configuration';
import { AccountService } from './account.service';
import { LinkMicrosoftAccountInput } from './inputs/link-microsofr-account.input';

@Controller('/account')
export class AccountController {
  constructor(
    private readonly config: ConfigService<Configuration>,
    private readonly accountService: AccountService,
  ) {}

  @Get('/microsoft-auth/url')
  async getMicrosoftAuthUrl(@Req() req: Request) {
    authorizeRequest(req);

    const tenantId = this.config.get('MS_GRAPH_TENANT_ID');
    const clientId = this.config.get('MS_GRAPH_CLIENT_ID');
    return {
      url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&scope=.default&response_type=code`,
    };
  }

  @Post('/microsoft-auth/link')
  async linkMicrosoftAccount(
    @Req() req: Request,
    @Body() input: LinkMicrosoftAccountInput,
  ) {
    const { userId } = authorizeRequest(req);
    const createdId = await this.accountService.createAccountWithMicrosoftAuth({
      userId,
      authorizationCode: input.authorizationCode,
    });
    return { createdId };
  }

  @Get()
  async listUserAccounts(@Req() req: Request) {
    const { userId } = authorizeRequest(req);
    const accounts = await this.accountService.listUserAccounts(userId);
    return {
      count: accounts.count,
      list: accounts.list.map((el) => ({
        id: el.id,
        type: el.type,
        email: el.email,
        name: el.name,
        label: el.label,
        createdAt: el.createdAt,
      })),
    };
  }
}
