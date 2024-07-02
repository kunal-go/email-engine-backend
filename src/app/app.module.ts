import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { configuration } from '../configuration';
import { AccountModule } from '../features/account/account.module';
import { EventModule } from '../features/event/event.module';
import { FolderModule } from '../features/folder/folder.module';
import { MessageModule } from '../features/message/message.module';
import { MicrosoftAccountModule } from '../features/microsoft-account/microsoft-account.module';
import { UserModule } from '../features/user/user.module';
import { DatabaseModule } from '../features/database/database.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    EventModule,
    UserModule,
    AccountModule,
    MicrosoftAccountModule,
    FolderModule,
    MessageModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
