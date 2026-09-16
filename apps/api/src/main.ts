import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('ERP API')
    .setDescription('Available ERP endpoints and resource APIs')
    .setVersion('1.0')
    .addServer('http://localhost:4000')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'ERP API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT || 4000);
}

bootstrap();
