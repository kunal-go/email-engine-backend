import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { authorizeRequest } from '../../common/auth/authorization';
import { AccountService } from '../account/account.service';
import { MailFolderService } from './mail-folder.service';

@Controller('/account/:accountId/mail-folder')
export class MailFolderController {
  constructor(
    private readonly accountService: AccountService,
    private readonly mailFolderService: MailFolderService,
  ) {}

  @Get()
  async listMailFolders(
    @Req() req: Request,
    @Param('accountId') accountId: string,
  ) {
    const { userId } = authorizeRequest(req);
    const account = await this.accountService.getAccountById(userId, accountId);
    if (!account) {
      return { count: 0, list: [] };
    }

    const mailFolders = await this.mailFolderService.listMailFolders(accountId);
    return {
      count: mailFolders.count,
      list: mailFolders.list.map((el) => ({
        id: el.id,
        externalId: el.externalId,
        name: el.name,
        itemCount: el.itemCount,
        unreadItemCount: el.unreadItemCount,
        syncedItemCount: el.syncedItemCount,
        lastSyncedAt: el.lastSyncedAt,
      })),
    };
  }
}
