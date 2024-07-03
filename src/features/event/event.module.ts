import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { MicrosoftAccountModule } from '../microsoft-account/microsoft-account.module';
import { EventConsumer } from './event.consumer';
import { MessageModule } from '../message/message.module';
import { FolderModule } from '../folder/folder.module';

@Module({
  imports: [AccountModule, MicrosoftAccountModule, MessageModule, FolderModule],
  providers: [EventConsumer],
})
export class EventModule {}
