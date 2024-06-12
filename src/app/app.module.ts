import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '../configuration';
import { AccountModule } from '../features/account/account.module';
import { UserModule } from '../features/user/user.module';
import { ElasticSearchProviderModule } from '../providers/elastic-search-provider/elastic-search-provider.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ElasticSearchProviderModule,
    UserModule,
    AccountModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
