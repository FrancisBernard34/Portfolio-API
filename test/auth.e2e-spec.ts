import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    role: 'ADMIN',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Create test user
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await prismaService.user.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    // Cleanup test user
    await prismaService.user.deleteMany({
      where: { email: testUser.email },
    });
    await prismaService.$disconnect();
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should return tokens and user data when credentials are valid', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('email', testUser.email);
          expect(res.body.user).toHaveProperty('role', testUser.role);
        });
    });

    it('should return 401 when credentials are invalid', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password,
        })
        .expect(400);
    });
  });

  describe('/auth/refresh-token (POST)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Login to get a refresh token
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      refreshToken = response.body.refreshToken;
    });

    it('should return new tokens when refresh token is valid', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refresh_token: refreshToken,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('email', testUser.email);
          expect(res.body.user).toHaveProperty('role', testUser.role);
          expect(res.body.refreshToken).not.toBe(refreshToken);
        });
    });

    it('should return 401 when refresh token is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refresh_token: 'invalid-refresh-token',
        })
        .expect(401);
    });

    it('should return 401 when using the same refresh token twice', async () => {
      // First refresh
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refresh_token: refreshToken,
        })
        .expect(201);

      // Second refresh with same token
      return request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refresh_token: refreshToken,
        })
        .expect(401);
    });
  });
});
