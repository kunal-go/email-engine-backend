import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { authorizeRequest } from '../../common/auth/authorization';
import { AccountService } from '../account/account.service';
import { MARK_MESSAGE_AS_READ } from '../event/constants';
import { FolderService } from '../folder/folder.service';
import { MessageService } from './message.service';

@Controller('/account/:accountId/mail-folder/:folderId/message')
export class MessageController {
  constructor(
    private readonly event: EventEmitter2,
    private readonly accountService: AccountService,
    private readonly folderService: FolderService,
    private readonly messageService: MessageService,
  ) {}

  @Get()
  async getMessageList(
    @Req() req: Request,
    @Param('accountId') accountId: string,
    @Param('folderId') folderId: string,
    @Query('page') page: string,
    @Query('size') size: string,
  ) {
    const paginate = {
      page: parseInt(page) || 1,
      size: parseInt(size) || 10,
    };

    const { userId } = authorizeRequest(req);
    const account = await this.accountService.getAccountById(userId, accountId);
    const folder = await this.folderService.getFolderById(accountId, folderId);
    if (!account || !folder) {
      return { count: 0, list: [] };
    }

    const message = await this.messageService.getMessageList(
      folderId,
      paginate,
    );
    return {
      count: message.count,
      list: message.list.map((el) => ({
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

  @Post('/:messageId/read')
  async markMessageAsRead(
    @Req() req: Request,
    @Param('accountId') accountId: string,
    @Param('folderId') folderId: string,
    @Param('messageId') messageId: string,
  ) {
    const { userId } = authorizeRequest(req);
    this.event.emit(MARK_MESSAGE_AS_READ, {
      userId,
      accountId,
      folderId,
      messageId,
    });
    return { message: 'We have taken your request to mark message as read' };
  }
}
