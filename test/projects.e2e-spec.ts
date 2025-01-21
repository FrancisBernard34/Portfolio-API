import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Category, Role, Project } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import * as bcrypt from 'bcrypt';

const NON_EXISTENT_ID = '507f1f77bcf86cd799439011';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authService: AuthService;
  let adminToken: string;

  const mockProject = {
    title: 'Test Project',
    description: 'Test Description',
    technologies: ['Node.js', 'React'],
    imageUrl: 'https://test.com/image.jpg',
    liveUrl: 'https://test.com',
    githubUrl: 'https://github.com/test',
    featured: true,
    importance: 1,
    category: Category.FULL_STACK,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    prismaService = app.get<PrismaService>(PrismaService);
    authService = app.get<AuthService>(AuthService);

    await app.init();

    // Create admin user and get token
    const hashedPassword = await bcrypt.hash('password123', 10);
    const _adminUser = await prismaService.user.create({
      data: {
        email: 'admin@test.com',
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prismaService.project.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  describe('/api/projects (POST)', () => {
    beforeEach(async () => {
      const { access_token } = await authService.login({
        email: 'admin@test.com',
        password: 'password123',
      });
      adminToken = access_token;
    });

    it('should create a project when admin is authenticated', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mockProject)
        .expect(201)
        .expect((res) => {
          expect(res.body).toMatchObject(mockProject);
          expect(res.body.id).toBeDefined();
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.updatedAt).toBeDefined();
        });
    });

    it('should fail to create project without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .send(mockProject)
        .expect(401);
    });

    it('should fail with invalid data', () => {
      const invalidProject = { ...mockProject, imageUrl: 'invalid-url' };
      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProject)
        .expect(400);
    });
  });

  describe('/api/projects (GET)', () => {
    let _testProject: Project;

    beforeEach(async () => {
      _testProject = await prismaService.project.create({
        data: mockProject,
      });
    });

    afterEach(async () => {
      await prismaService.project.deleteMany();
    });

    it('should get all projects', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body[0]).toMatchObject(mockProject);
        });
    });

    it('should filter projects by category', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .query({ category: Category.FULL_STACK })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body[0].category).toBe(Category.FULL_STACK);
        });
    });

    it('should filter projects by featured', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .query({ featured: true })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body[0].featured).toBe(true);
        });
    });

    it('should sort projects by importance', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .query({ sort: 'importance', order: 'desc' })
        .expect(200);
    });
  });

  describe('/api/projects/:id (GET)', () => {
    let testProject: Project;

    beforeEach(async () => {
      testProject = await prismaService.project.create({
        data: mockProject,
      });
    });

    afterEach(async () => {
      await prismaService.project.deleteMany();
    });

    it('should get project by id', () => {
      return request(app.getHttpServer())
        .get(`/api/projects/${testProject.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(mockProject);
          expect(res.body.id).toBe(testProject.id);
        });
    });

    it('should return 404 for non-existent project', () => {
      return request(app.getHttpServer())
        .get(`/api/projects/${NON_EXISTENT_ID}`)
        .expect(404);
    });
  });

  describe('/api/projects/:id (PATCH)', () => {
    let testProject: Project;

    beforeEach(async () => {
      testProject = await prismaService.project.create({
        data: mockProject,
      });

      const { access_token } = await authService.login({
        email: 'admin@test.com',
        password: 'password123',
      });
      adminToken = access_token;
    });

    afterEach(async () => {
      await prismaService.project.deleteMany();
    });

    it('should update project when admin is authenticated', () => {
      const updateData = { title: 'Updated Title' };
      return request(app.getHttpServer())
        .patch(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe(updateData.title);
          expect(res.body.id).toBe(testProject.id);
        });
    });

    it('should fail to update project without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/api/projects/${testProject.id}`)
        .send({ title: 'Updated Title' })
        .expect(401);
    });

    it('should return 404 for non-existent project', () => {
      const updateData = { title: 'Updated Title' };
      return request(app.getHttpServer())
        .patch(`/api/projects/${NON_EXISTENT_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('/api/projects/:id (DELETE)', () => {
    let testProject: Project;

    beforeEach(async () => {
      testProject = await prismaService.project.create({
        data: mockProject,
      });

      const { access_token } = await authService.login({
        email: 'admin@test.com',
        password: 'password123',
      });
      adminToken = access_token;
    });

    afterEach(async () => {
      await prismaService.project.deleteMany();
    });

    it('should delete project when admin is authenticated', () => {
      return request(app.getHttpServer())
        .delete(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should fail to delete project without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/api/projects/${testProject.id}`)
        .expect(401);
    });

    it('should return 404 for non-existent project', () => {
      return request(app.getHttpServer())
        .delete(`/api/projects/${NON_EXISTENT_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
