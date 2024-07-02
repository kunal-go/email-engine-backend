import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { DatabaseModule } from '../database/database.module';
import { FolderModule } from '../folder/folder.module';
import { UserModule } from '../user/user.module';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';

@Module({
  imports: [UserModule, AccountModule, FolderModule, DatabaseModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
