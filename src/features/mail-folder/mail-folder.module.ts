import { Module } from '@nestjs/common';
import { ElasticSearchProviderModule } from '../../providers/elastic-search-provider/elastic-search-provider.module';
import { MsGraphApiProviderModule } from '../../providers/ms-graph-api-provider/ms-graph-api-provider.module';
import { AccountModule } from '../account/account.module';
import { UserModule } from '../user/user.module';
import { MailFolderController } from './mail-folder.controller';
import { MailFolderService } from './mail-folder.service';

@Module({
  imports: [
    UserModule,
    AccountModule,
    ElasticSearchProviderModule,
    MsGraphApiProviderModule,
  ],
  controllers: [MailFolderController],
  providers: [MailFolderService],
})
export class MailFolderModule {}
