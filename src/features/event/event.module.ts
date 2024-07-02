import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { MicrosoftAccountModule } from '../microsoft-account/microsoft-account.module';
import { EventConsumer } from './event.consumer';

@Module({
  imports: [AccountModule, MicrosoftAccountModule],
  providers: [EventConsumer],
})
export class EventModule {}
