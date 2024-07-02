import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { authorizeRequest } from '../../common/auth/authorization';
import { AccountService } from '../account/account.service';
import { FolderService } from '../folder/folder.service';
import { MessageService } from './message.service';

@Controller('/account/:accountId/mail-folder/:mailFolderId/message')
export class MessageController {
  constructor(
    private readonly accountService: AccountService,
    private readonly folderService: FolderService,
    private readonly messageService: MessageService,
  ) {}

  @Get()
  async getMessageList(
    @Req() req: Request,
    @Param('accountId') accountId: string,
    @Param('mailFolderId') mailFolderId: string,
    @Query('page') page: string,
    @Query('size') size: string,
  ) {
    const paginate = {
      page: parseInt(page) || 1,
      size: parseInt(size) || 10,
    };

    const { userId } = authorizeRequest(req);
    const account = await this.accountService.getAccountById(userId, accountId);
    const mailFolder = await this.folderService.getFolderById(
      accountId,
      mailFolderId,
    );
    if (!account || !mailFolder) {
      return { count: 0, list: [] };
    }

    const mailMessages = await this.messageService.getMessageList(
      mailFolderId,
      paginate,
    );
    return {
      count: mailMessages.count,
      list: mailMessages.list.map((el) => ({
        id: el.id,
        createdDateTime: el.createdDateTime,
        lastModifiedDateTime: el.lastModifiedDateTime,
        receivedDateTime: el.receivedDateTime,
        sentDateTime: el.sentDateTime,
        hasAttachments: el.hasAttachments,
        internetMessageId: el.internetMessageId,
        subject: el.subject,
        bodyPreview: el.bodyPreview,
        conversationId: el.conversationId,
        isRead: el.isRead,
        isDraft: el.isDraft,
        webLink: el.webLink,
        body: el.body,
        sender: el.sender,
        from: el.from,
        toRecipients: el.toRecipients,
        ccRecipients: el.ccRecipients,
        bccRecipients: el.bccRecipients,
        replyTo: el.replyTo,
        isFlagged: el.isFlagged,
        lastSyncedAt: el.lastSyncedAt,
      })),
    };
  }
}
