import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { Configuration } from '../../configuration';
import { ElasticSearchProviderService } from './elastic-search-provider.service';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<Configuration>) => ({
        node: configService.get('ES_DB_HOST'),
        auth: {
          username: 'elastic',
          password: configService.get('ES_DB_PASSWORD'),
        },
      }),
    }),
  ],
  providers: [ElasticSearchProviderService],
  exports: [ElasticSearchProviderService],
})
export class ElasticSearchProviderModule {}
