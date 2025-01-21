import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as nodemailer from 'nodemailer';

describe('ContactController (e2e)', () => {
  let app: INestApplication;
  let mockSendMail: jest.Mock;

  beforeEach(async () => {
    const mockTransporter = {
      sendMail: jest.fn().mockImplementation(() => Promise.resolve()),
    };
    mockSendMail = mockTransporter.sendMail;
    jest
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue(mockTransporter as any);

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
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  describe('/api/contact (POST)', () => {
    const validContactData = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'This is a test message that is long enough.',
    };

    it('should send contact email successfully', () => {
      return request(app.getHttpServer())
        .post('/api/contact')
        .send(validContactData)
        .expect(201)
        .expect({ message: 'Email sent successfully' });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/contact')
        .send({ ...validContactData, email: 'invalid-email' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message[0]).toContain('email must be an email');
        });
    });

    it('should fail with short message', () => {
      return request(app.getHttpServer())
        .post('/api/contact')
        .send({ ...validContactData, message: 'short' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message[0]).toContain(
            'message must be longer than or equal to 10 characters',
          );
        });
    });

    it('should fail with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/contact')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([
              expect.stringContaining('name'),
              expect.stringContaining('email'),
              expect.stringContaining('message'),
            ]),
          );
        });
    });

    it('should handle email service failure', async () => {
      mockSendMail.mockImplementationOnce(() =>
        Promise.reject(new Error('Send failed')),
      );

      return request(app.getHttpServer())
        .post('/api/contact')
        .send(validContactData)
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toBe('Failed to send email');
        });
    });
  });
});
