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
    const sortedMailFolders = this.sortMailFolders(mailFolders.list);
    return {
      count: mailFolders.count,
      list: sortedMailFolders.map((el) => ({
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

  private sortMailFolders(mailFolders: any[]) {
    // Only microsoft account folders as of now
    const folderNameSequence = [
      'Inbox',
      'Drafts',
      'Sent Items',
      'Outbox',
      'Junk Email',
      'Archive',
      'Deleted Items',
    ];

    const sortedMailFolders = mailFolders.sort((a, b) => {
      const aIndex = folderNameSequence.indexOf(a.name);
      const bIndex = folderNameSequence.indexOf(b.name);
      if (aIndex === -1 && bIndex === -1) {
        return a.name.localeCompare(b.name);
      }
      if (aIndex === -1) {
        return 1;
      }
      if (bIndex === -1) {
        return -1;
      }
      return aIndex - bIndex;
    });

    return sortedMailFolders;
  }
}
