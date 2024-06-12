import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { configuration } from '../configuration';
import { AccountModule } from '../features/account/account.module';
import { MailFolderModule } from '../features/mail-folder/mail-folder.module';
import { UserModule } from '../features/user/user.module';
import { ElasticSearchProviderModule } from '../providers/elastic-search-provider/elastic-search-provider.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    EventEmitterModule.forRoot(),
    ElasticSearchProviderModule,
    UserModule,
    AccountModule,
    MailFolderModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
