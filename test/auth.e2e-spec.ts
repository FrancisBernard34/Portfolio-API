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
    it('should return access token and user data when credentials are valid', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).not.toHaveProperty('refresh_token');
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

  describe('Protected Routes', () => {
    let accessToken: string;
    let _refreshToken: string;

    beforeEach(async () => {
      // Login to get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.access_token;
    });

    it('should receive refresh token after first protected route access', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Project',
          description: 'Test Description',
          technologies: ['Test'],
          imageUrl: 'https://test.com/image.jpg',
          featured: false,
          importance: 1,
        })
        .expect(201);

      expect(response.headers).toHaveProperty('x-refresh-token');
      _refreshToken = response.headers['x-refresh-token'];
    });

    it('should not allow reuse of access token', async () => {
      // First request should succeed and return refresh token
      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Project 1',
          description: 'Test Description',
          technologies: ['Test'],
          imageUrl: 'https://test.com/image.jpg',
          featured: false,
          importance: 1,
        })
        .expect(201);

      // Second request with same token should fail
      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Project 2',
          description: 'Test Description',
          technologies: ['Test'],
          imageUrl: 'https://test.com/image.jpg',
          featured: false,
          importance: 1,
        })
        .expect(401);
    });
  });

  describe('/auth/refresh-token (POST)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Login and make a protected request to get refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const protectedResponse = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .send({
          title: 'Test Project',
          description: 'Test Description',
          technologies: ['Test'],
          imageUrl: 'https://test.com/image.jpg',
          featured: false,
          importance: 1,
        });

      refreshToken = protectedResponse.headers['x-refresh-token'];
    });

    it('should return new access token when refresh token is valid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refresh_token: refreshToken,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('role', testUser.role);
    });

    it('should not allow reuse of refresh token', async () => {
      // First refresh should succeed
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refresh_token: refreshToken,
        })
        .expect(201);

      // Second refresh with same token should fail
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refresh_token: refreshToken,
        })
        .expect(401);
    });

    it('should return 401 when refresh token is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refresh_token: 'invalid-refresh-token',
        })
        .expect(401);
    });
  });
});
