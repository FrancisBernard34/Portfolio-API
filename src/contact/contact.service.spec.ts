import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ContactService } from './contact.service';
import { InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
  }),
}));

describe('ContactService', () => {
  let service: ContactService;
  let mockConfigService: Partial<ConfigService>;
  let mockTransporter: { sendMail: jest.Mock };

  const mockContactDto = {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'This is a test message',
  };

  beforeEach(async () => {
    // Reset sendMail mock before each test
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue(true),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          EMAIL_USER: 'test@example.com',
          EMAIL_APP_PASSWORD: 'test-password',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendContactEmail', () => {
    it('should send email successfully', async () => {
      await service.sendContactEmail(mockContactDto);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@example.com',
          to: 'test@example.com',
          subject: `Portfolio Contact: ${mockContactDto.name}`,
          text: expect.stringContaining(mockContactDto.name),
          html: expect.stringContaining(mockContactDto.name),
        }),
      );
    });

    it('should throw InternalServerErrorException when email sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('Send failed'));

      await expect(service.sendContactEmail(mockContactDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
