import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { Configuration } from '../../configuration';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<Configuration>) =>
        ({
          node: configService.get('ES_DB_HOST'),
          auth: {
            username: 'elastic',
            password: configService.get('ES_DB_PASSWORD'),
          },
        }) as any,
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
