import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { FolderModule } from '../folder/folder.module';
import { MessageModule } from '../message/message.module';
import { UserModule } from '../user/user.module';
import { MicrosoftAccountMailSyncService } from './microsoft-account-mail-sync.provider';
import { MicrosoftAccountController } from './microsoft-account.controller';
import { MicrosoftAccountService } from './microsoft-account.service';
import { MicrosoftExternalApiService } from './microsoft-external-api.service';

@Module({
  imports: [UserModule, AccountModule, FolderModule, MessageModule],
  controllers: [MicrosoftAccountController],
  providers: [
    MicrosoftAccountService,
    MicrosoftExternalApiService,
    MicrosoftAccountMailSyncService,
  ],
  exports: [MicrosoftAccountMailSyncService],
})
export class MicrosoftAccountModule {}
