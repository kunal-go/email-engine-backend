import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ElasticSearchProviderModule } from '../../providers/elastic-search-provider/elastic-search-provider.module';

@Module({
  imports: [ElasticSearchProviderModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
