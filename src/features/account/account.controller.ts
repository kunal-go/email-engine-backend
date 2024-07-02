import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { authorizeRequest } from '../../common/auth/authorization';
import { SYNC_ACCOUNT_FOLDERS_EVENT } from '../event/constants';
import { AccountService } from './account.service';

@Controller('/account')
export class AccountController {
  constructor(
    private readonly event: EventEmitter2,
    private readonly accountService: AccountService,
  ) {}

  @Get()
  async getAccountList(@Req() req: Request) {
    const { userId } = authorizeRequest(req);
    const accounts = await this.accountService.listAccounts(userId);
    return {
      count: accounts.count,
      list: accounts.list.map((el) => ({
        id: el.id,
        type: el.metadata.type,
        email: el.email,
        name: el.name,
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
      type: account.metadata.type,
      email: account.email,
      name: account.name,
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

    this.event.emit(SYNC_ACCOUNT_FOLDERS_EVENT, { userId, accountId });
    return { message: 'Account data syncing process is started.' };
  }

  @Delete(':accountId')
  async deleteAccount(
    @Req() req: Request,
    @Param('accountId') accountId: string,
  ) {
    const { userId } = authorizeRequest(req);
    await this.accountService.deleteAccount(userId, accountId);
    return { message: 'Account deleted' };
  }
}
