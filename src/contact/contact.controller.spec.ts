import { Test, TestingModule } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

describe('ContactController', () => {
  let controller: ContactController;
  let mockContactService: { sendContactEmail: jest.Mock };

  const mockContactDto: ContactDto = {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'This is a test message',
  };

  beforeEach(async () => {
    mockContactService = {
      sendContactEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        {
          provide: ContactService,
          useValue: mockContactService,
        },
      ],
    }).compile();

    controller = module.get<ContactController>(ContactController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendContactMessage', () => {
    it('should call service and return success message', async () => {
      const result = await controller.sendContactMessage(mockContactDto);

      expect(mockContactService.sendContactEmail).toHaveBeenCalledWith(
        mockContactDto,
      );
      expect(result).toEqual({ message: 'Email sent successfully' });
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Test error');
      mockContactService.sendContactEmail.mockRejectedValue(error);

      await expect(
        controller.sendContactMessage(mockContactDto),
      ).rejects.toThrow(error);
    });
  });
});
