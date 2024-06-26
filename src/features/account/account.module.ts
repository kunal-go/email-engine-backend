import { Module, forwardRef } from '@nestjs/common';
import { ElasticSearchProviderModule } from '../../providers/elastic-search-provider/elastic-search-provider.module';
import { MsGraphApiProviderModule } from '../../providers/ms-graph-api-provider/ms-graph-api-provider.module';
import { MailFolderModule } from '../mail-folder/mail-folder.module';
import { UserModule } from '../user/user.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { MicrosoftAuthController } from './microsoft-auth.controller';

@Module({
  imports: [
    forwardRef(() => MsGraphApiProviderModule),
    forwardRef(() => MailFolderModule),
    UserModule,
    ElasticSearchProviderModule,
  ],
  controllers: [AccountController, MicrosoftAuthController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
