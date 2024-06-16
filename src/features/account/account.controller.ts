import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { authorizeRequest } from '../../common/auth/authorization';
import { SYNC_ACCOUNT_DATA_EVENT } from '../../common/events';
import { Configuration } from '../../configuration';
import { AccountService } from './account.service';
import { LinkMicrosoftAccountInput } from './inputs/link-microsoft-account.input';

@Controller('/account')
export class AccountController {
  constructor(
    private readonly config: ConfigService<Configuration>,
    private readonly accountService: AccountService,
    private eventEmitter: EventEmitter2,
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
  async listAccounts(@Req() req: Request) {
    const { userId } = authorizeRequest(req);
    const accounts = await this.accountService.listAccounts(userId);
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

  @Get(':accountId')
  async getAccount(@Req() req: Request, @Param('accountId') accountId: string) {
    const { userId } = authorizeRequest(req);
    const account = await this.accountService.getAccountById(userId, accountId);
    if (!account) {
      throw new UnprocessableEntityException('Account not found');
    }
    return {
      id: account.id,
      type: account.type,
      email: account.email,
      name: account.name,
      label: account.label,
      createdAt: account.createdAt,
    };
  }

  @Post(':accountId/sync')
  async syncAccountMailData(
    @Req() req: Request,
    @Param('accountId') accountId: string,
  ) {
    const { userId } = authorizeRequest(req);
    const account = await this.accountService.getAccountById(userId, accountId);
    if (!account) {
      throw new UnprocessableEntityException('Account not found');
    }

    this.eventEmitter.emit(SYNC_ACCOUNT_DATA_EVENT, { userId, accountId });
    return { message: 'Data syncing process started.' };
  }
}
