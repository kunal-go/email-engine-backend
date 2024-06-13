import { Module, forwardRef } from '@nestjs/common';
import { AccountModule } from '../../features/account/account.module';
import { MsGraphApiProviderService } from './ms-graph-api-provider.service';

@Module({
  imports: [forwardRef(() => AccountModule)],
  providers: [MsGraphApiProviderService],
  exports: [MsGraphApiProviderService],
})
export class MsGraphApiProviderModule {}
