import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder } from '@nestjs/swagger';

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());

  const configService = app.get(ConfigService);

  app.enableCors({
    credentials: true,
    origin: configService.get<string>('CLIENT_URL') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Telegram Miniapp API')
    .setDescription('API Documentation for Telegram Miniapp.')
    .setVersion('1.0')
    .addCookieAuth('token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(configService.get<string>('PORT') || 3000, () => {
    console.log(
      `Server started on port: ${configService.get<string>('PORT') || 3000}`,
    );
  });
}
bootstrap();
