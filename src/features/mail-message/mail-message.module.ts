import { Module } from '@nestjs/common';
import { ElasticSearchProviderModule } from '../../providers/elastic-search-provider/elastic-search-provider.module';
import { MsGraphApiProviderModule } from '../../providers/ms-graph-api-provider/ms-graph-api-provider.module';
import { AccountModule } from '../account/account.module';
import { MailFolderModule } from '../mail-folder/mail-folder.module';
import { UserModule } from '../user/user.module';
import { MailMessageController } from './mail-message.controller';
import { MailMessageService } from './mail-message.service';

@Module({
  imports: [
    UserModule,
    AccountModule,
    MailFolderModule,
    ElasticSearchProviderModule,
    MsGraphApiProviderModule,
  ],
  controllers: [MailMessageController],
  providers: [MailMessageService],
})
export class MailMessageModule {}
