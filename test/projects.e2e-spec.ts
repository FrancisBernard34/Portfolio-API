import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';
import * as bcrypt from 'bcrypt';
import { Category } from '@prisma/client';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;

  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    role: 'ADMIN',
  };

  const testProject = {
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

    // Get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    accessToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup test data
    await prismaService.project.deleteMany();
    await prismaService.user.deleteMany({
      where: { email: testUser.email },
    });
    await prismaService.$disconnect();
    await app.close();
  });

  describe('POST /api/projects', () => {
    it('should create a new project when user is admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProject)
        .expect(201);

      expect(response.body).toMatchObject(testProject);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 401 when token is not provided', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .send(testProject)
        .expect(401);
    });

    it('should return 400 when required fields are missing', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Project',
        })
        .expect(400);
    });
  });

  describe('GET /api/projects', () => {
    let _projectId: string;

    beforeEach(async () => {
      // Create a test project
      const project = await prismaService.project.create({
        data: testProject,
      });
      _projectId = project.id;
    });

    afterEach(async () => {
      // Cleanup test project
      await prismaService.project.deleteMany();
    });

    it('should return all projects', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toMatchObject(testProject);
        });
    });

    it('should filter projects by category', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .query({ category: Category.FULL_STACK })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0].category).toBe(Category.FULL_STACK);
        });
    });

    it('should filter featured projects', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .query({ featured: true })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0].featured).toBe(true);
        });
    });

    it('should sort projects by importance', () => {
      return request(app.getHttpServer())
        .get('/api/projects')
        .query({ sort: 'importance', order: 'desc' })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /api/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      // Create a test project
      const project = await prismaService.project.create({
        data: testProject,
      });
      projectId = project.id;
    });

    afterEach(async () => {
      // Cleanup test project
      await prismaService.project.deleteMany();
    });

    it('should return a project by id', () => {
      return request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(testProject);
          expect(res.body.id).toBe(projectId);
        });
    });

    it('should return 404 when project is not found', () => {
      return request(app.getHttpServer())
        .get('/api/projects/non-existent-id')
        .expect(404);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      // Create a test project
      const project = await prismaService.project.create({
        data: testProject,
      });
      projectId = project.id;
    });

    afterEach(async () => {
      // Cleanup test project
      await prismaService.project.deleteMany();
    });

    it('should update a project when user is admin', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
      expect(response.body.id).toBe(projectId);
    });

    it('should return 401 when token is not provided', () => {
      return request(app.getHttpServer())
        .patch(`/api/projects/${projectId}`)
        .send({ title: 'Updated Title' })
        .expect(401);
    });

    it('should return 404 when project is not found', () => {
      return request(app.getHttpServer())
        .patch('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      // Create a test project
      const project = await prismaService.project.create({
        data: testProject,
      });
      projectId = project.id;
    });

    afterEach(async () => {
      // Cleanup any remaining test projects
      await prismaService.project.deleteMany();
    });

    it('should delete a project when user is admin', () => {
      return request(app.getHttpServer())
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject(testProject);
          expect(res.body.id).toBe(projectId);
        });
    });

    it('should return 401 when token is not provided', () => {
      return request(app.getHttpServer())
        .delete(`/api/projects/${projectId}`)
        .expect(401);
    });

    it('should return 404 when project is not found', () => {
      return request(app.getHttpServer())
        .delete('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
