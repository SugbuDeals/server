import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ChatRequestDto } from './dto/chat.dto';
import { FreeformRecommendationDto } from './dto/recommendation.dto';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;

  const mockAiService = {
    chat: jest.fn(),
    generateText: jest.fn(),
    getRecommendationsFromQuery: jest.fn(),
    getSimilarProducts: jest.fn(),
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
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      };

      const mockResponse = {
        content: 'Hello! How can I help you?',
        role: 'assistant',
      };

      mockAiService.chat.mockResolvedValue(mockResponse);

      const result = await controller.chat(chatRequest);

      expect(mockAiService.chat).toHaveBeenCalledWith(chatRequest.messages);
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('role');
    });
  });

  describe('POST /ai/generate', () => {
    it('should return generated text matching Swagger schema', async () => {
      const generateRequest = {
        prompt: 'Generate a product description',
      };

      const mockResponse = {
        content: 'Generated product description...',
      };

      mockAiService.generateText.mockResolvedValue(mockResponse);

      const result = await controller.generateText(generateRequest);

      expect(mockAiService.generateText).toHaveBeenCalledWith(generateRequest.prompt);
      expect(result).toHaveProperty('content');
    });
  });

  describe('POST /ai/recommendations/freeform', () => {
    it('should return recommendations matching Swagger schema', async () => {
      const recommendationDto: FreeformRecommendationDto = {
        query: 'Find me electronics',
      };

      const mockResponse = {
        recommendations: [
          { id: 1, name: 'Product 1' },
          { id: 2, name: 'Product 2' },
        ],
      };

      mockAiService.getRecommendationsFromQuery.mockResolvedValue(mockResponse);

      const result = await controller.getRecommendations(recommendationDto);

      expect(mockAiService.getRecommendationsFromQuery).toHaveBeenCalled();
      expect(result).toHaveProperty('recommendations');
    });
  });
});

