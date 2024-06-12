import { Module } from '@nestjs/common';
import { ElasticSearchProviderModule } from '../../providers/elastic-search-provider/elastic-search-provider.module';
import { MsGraphApiProviderModule } from '../../providers/ms-graph-api-provider/ms-graph-api-provider.module';
import { UserModule } from '../user/user.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [UserModule, ElasticSearchProviderModule, MsGraphApiProviderModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
