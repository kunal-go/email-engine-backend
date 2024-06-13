import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { authorizeRequest } from '../../common/auth/authorization';
import { AccountService } from '../account/account.service';
import { MailFolderService } from '../mail-folder/mail-folder.service';
import { MailMessageService } from './mail-message.service';

@Controller('/account/:accountId/mail-folder/:mailFolderId/message')
export class MailMessageController {
  constructor(
    private readonly accountService: AccountService,
    private readonly mailFolderService: MailFolderService,
    private readonly mailMessageService: MailMessageService,
  ) {}

  @Get()
  async listMailFolders(
    @Req() req: Request,
    @Param('accountId') accountId: string,
    @Param('mailFolderId') mailFolderId: string,
  ) {
    const { userId } = authorizeRequest(req);
    const account = await this.accountService.getAccountById(userId, accountId);
    const mailFolder = await this.mailFolderService.getMailFolderById(
      accountId,
      mailFolderId,
    );
    if (!account || !mailFolder) {
      return { count: 0, list: [] };
    }

    const mailMessages =
      await this.mailMessageService.listMailMessages(mailFolderId);
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
