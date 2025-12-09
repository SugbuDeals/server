import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ChatRequestDto } from './dto/chat.dto';
import { UserRole } from 'generated/prisma';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;

  const mockAiService = {
    chat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /ai/chat', () => {
    it('should return chat response matching Swagger schema', async () => {
      const chatRequest: ChatRequestDto = {
        content: 'Hello',
        count: 3,
      };

      const mockResponse = {
        content: 'Hello! How can I help you?',
        intent: 'chat' as const,
      };

      const mockRequest = {
        user: {
          sub: 1,
          email: 'test@example.com',
          role: UserRole.CONSUMER,
        },
      } as any;

      mockAiService.chat.mockResolvedValue(mockResponse);

      const result = await controller.chat(mockRequest, chatRequest);

      expect(mockAiService.chat).toHaveBeenCalledWith(
        mockRequest.user.sub,
        mockRequest.user.role,
        chatRequest.content,
        chatRequest.latitude,
        chatRequest.longitude,
        chatRequest.radius,
        chatRequest.count,
      );
      expect(result).toHaveProperty('content');
    });
  });
});

