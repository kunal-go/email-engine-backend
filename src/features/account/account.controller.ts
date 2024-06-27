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
import { SYNC_ACCOUNT_MAIL_FOLDERS } from '../../common/events';
import { AccountService } from './account.service';

@Controller('/account')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

    this.eventEmitter.emit(SYNC_ACCOUNT_MAIL_FOLDERS, {
      userId,
      accountId,
    });
    return { message: 'Data syncing process started.' };
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
