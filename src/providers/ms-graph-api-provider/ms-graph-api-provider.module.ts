import { Module } from '@nestjs/common';
import { MsGraphApiProviderService } from './ms-graph-api-provider.service';

@Module({
  imports: [],
  providers: [MsGraphApiProviderService],
  exports: [MsGraphApiProviderService],
})
export class MsGraphApiProviderModule {}
