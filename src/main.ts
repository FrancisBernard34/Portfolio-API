import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Portfolio API')
    .setDescription(`
      REST API for managing portfolio projects. This API provides endpoints for creating, reading, updating, and deleting portfolio projects.
      
      ## Features
      - Project management with CRUD operations
      - Category-based filtering
      - Importance-based sorting
      - Authentication with JWT
      - Role-based access control
      
      ## Authentication
      Protected endpoints require a JWT token. To get a token:
      1. Use the /auth/login endpoint with valid credentials
      2. Include the token in the Authorization header as: Bearer <token>
      
      ## Categories
      Available project categories:
      - DEFAULT (default value)
      - FULL_STACK
      - FRONT_END
      - BACK_END
      - MOBILE
      - GAME
    `)
    .setVersion('1.0')
    .addTag('Authentication', 'Endpoints for authentication and authorization')
    .addTag('Projects', 'Endpoints for managing portfolio projects')
    .addBearerAuth()
    .setContact('Your Name', 'your-portfolio-url', 'your-email@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API Documentation available at: http://localhost:${port}/docs`);
}

bootstrap();
