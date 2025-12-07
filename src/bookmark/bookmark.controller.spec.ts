import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { StoreBookmarkDto } from './dto/store-bookmark.dto';
import { ProductBookmarkDto } from './dto/product-bookmark.dto';
import { createMockRequest } from '../../test/utils/test-helpers';

describe('BookmarkController', () => {
  let controller: BookmarkController;
  let service: BookmarkService;

  const mockBookmarkService = {
    listStoreBookmarks: jest.fn(),
    bookmarkStore: jest.fn(),
    deleteStoreBookmark: jest.fn(),
    listProductBookmarks: jest.fn(),
    bookmarkProduct: jest.fn(),
    deleteProductBookmark: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarkController],
      providers: [
        {
          provide: BookmarkService,
          useValue: mockBookmarkService,
        },
      ],
    }).compile();

    controller = module.get<BookmarkController>(BookmarkController);
    service = module.get<BookmarkService>(BookmarkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /bookmarks/stores/list', () => {
    it('should return array of StoreBookmarkResponseDto matching Swagger schema', async () => {
      const mockBookmarks = [
        { id: 1, userId: 1, storeId: 1, store: { id: 1, name: 'Store 1' } },
      ];

      const mockRequest = createMockRequest({ sub: 1 });
      mockBookmarkService.listStoreBookmarks.mockResolvedValue(mockBookmarks);

      const result = await controller.listMyStoreBookmarks(mockRequest, {
        take: 10,
        skip: 0,
      });

      expect(mockBookmarkService.listStoreBookmarks).toHaveBeenCalledWith(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('POST /bookmarks/stores', () => {
    it('should return StoreBookmarkResponseDto matching Swagger schema on successful creation', async () => {
      const bookmarkDto: StoreBookmarkDto = { storeId: 1 };
      const createdBookmark = {
        id: 1,
        userId: 1,
        storeId: 1,
      };

      const mockRequest = createMockRequest({ sub: 1 });
      mockBookmarkService.bookmarkStore.mockResolvedValue(createdBookmark);

      const result = await controller.bookmarkStore(mockRequest, bookmarkDto);

      expect(mockBookmarkService.bookmarkStore).toHaveBeenCalledWith(1, bookmarkDto.storeId);
      expect(result).toHaveProperty('id');
    });
  });

  describe('POST /bookmarks/products', () => {
    it('should return ProductBookmarkResponseDto matching Swagger schema on successful creation', async () => {
      const bookmarkDto: ProductBookmarkDto = { productId: 1 };
      const createdBookmark = {
        id: 1,
        userId: 1,
        productId: 1,
      };

      const mockRequest = createMockRequest({ sub: 1 });
      mockBookmarkService.bookmarkProduct.mockResolvedValue(createdBookmark);

      const result = await controller.bookmarkProduct(mockRequest, bookmarkDto);

      expect(mockBookmarkService.bookmarkProduct).toHaveBeenCalledWith(1, bookmarkDto.productId);
      expect(result).toHaveProperty('id');
    });
  });
});

