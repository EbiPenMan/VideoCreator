import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe());

  // Swagger setup
  const options = new DocumentBuilder()
    .setTitle('Video Generation API')
    .setDescription('API for video generation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);


  // Create a new Express instance
  const expressApp = express();

  // Serve static files from the 'assets' folder
  expressApp.use('/assets', express.static('assets'));

  // Set the Express instance as the underlying Express app for NestJS
  app.use(expressApp);


  await app.listen(3000);
}
bootstrap();
