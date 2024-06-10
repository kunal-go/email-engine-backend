import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Configuration } from './configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ stopAtFirstError: true }));

  const config = app.get(ConfigService<Configuration, true>);
  await app.listen(config.get('PORT'));
}
bootstrap();
