import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountModule } from '../account/account.module';
import { UserModule } from '../user/user.module';
import { FolderController } from './folder.controller';
import { FolderService } from './folder.service';

@Module({
  imports: [UserModule, forwardRef(() => AccountModule), DatabaseModule],
  controllers: [FolderController],
  providers: [FolderService],
  exports: [FolderService],
})
export class FolderModule {}
