import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ViewService } from './view.service';
import { RecordViewDto } from './dto/record-view.dto';
import { ListViewsDto } from './dto/list-views.dto';
import { ViewResponseDto, ViewCountResponseDto } from './dto/view-response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { EntityType } from 'generated/prisma';

/**
 * View Controller
 * 
 * REST API controller for view tracking and analytics endpoints.
 * Manages HTTP requests related to tracking user views of stores, products, and promotions.
 * 
 * **Base Path:** `/views`
 * 
 * **Endpoints:**
 * - `POST /views` - Record a view (authenticated)
 * - `GET /views/list` - List user's view history (authenticated)
 * - `GET /views/:entityType/:entityId/count` - Get view count for entity (public)
 * 
 * **Authentication:**
 * - Recording and listing views require JWT authentication
 * - View counts are publicly accessible without authentication
 * 
 * **View Behavior:**
 * - Each user can have at most one view record per entity
 * - Subsequent views update the `viewedAt` timestamp
 * - Views are unique per [userId, entityType, entityId] combination
 * 
 * **Use Cases:**
 * - Track user engagement with products, stores, and promotions
 * - Build "recently viewed" features
 * - Generate analytics on popular items
 * - Create personalized recommendations based on view history
 * 
 * **Error Handling:**
 * - 400 Bad Request: Invalid entity type or entity ID
 * - 401 Unauthorized: Missing or invalid JWT token (authenticated endpoints)
 * - 404 Not Found: Entity doesn't exist (validated at service layer)
 * 
 * @ApiTags Views
 * @Controller views
 * @see {@link ViewService} for business logic implementation
 */
@ApiTags('Views')
@Controller('views')
export class ViewController {
  /**
   * Creates a new ViewController instance
   * 
   * @param viewService - Injected ViewService for handling business logic
   */
  constructor(private readonly viewService: ViewService) {}

  /**
   * Record a view of an entity
   * 
   * Records that the authenticated user viewed a specific store, product, or promotion.
   * This endpoint uses an upsert pattern:
   * - **First time viewing:** Creates a new view record with current timestamp
   * - **Subsequent views:** Updates the existing record's viewedAt to current timestamp
   * 
   * **Authentication:** Required (JWT Bearer token)
   * 
   * **Idempotency:**
   * This endpoint is idempotent - calling it multiple times with the same parameters
   * will update the timestamp but won't create duplicate records.
   * 
   * **Request Body:**
   * ```json
   * {
   *   "entityType": "PRODUCT",
   *   "entityId": 42
   * }
   * ```
   * 
   * **Response:**
   * Returns the view record with metadata:
   * ```json
   * {
   *   "id": 123,
   *   "userId": 5,
   *   "entityType": "PRODUCT",
   *   "entityId": 42,
   *   "viewedAt": "2024-01-15T10:30:00.000Z"
   * }
   * ```
   * 
   * **Use Cases:**
   * - Track when users visit product detail pages
   * - Record store page visits for analytics
   * - Monitor promotion engagement
   * - Build view-based recommendations
   * 
   * **Client Integration:**
   * ```typescript
   * // Call this endpoint when user visits a product page
   * await fetch('/views', {
   *   method: 'POST',
   *   headers: {
   *     'Authorization': `Bearer ${token}`,
   *     'Content-Type': 'application/json'
   *   },
   *   body: JSON.stringify({
   *     entityType: 'PRODUCT',
   *     entityId: productId
   *   })
   * });
   * ```
   * 
   * @param req - Express request object with authenticated user in req.user
   * @param body - View data specifying what entity was viewed
   * @returns Promise resolving to the created or updated view record
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Record a view',
    description:
      'Records that the authenticated user viewed an entity (store, product, or promotion). ' +
      'If the user has already viewed this entity, updates the viewedAt timestamp. ' +
      'Otherwise, creates a new view record. This endpoint is idempotent and authenticated.',
  })
  @ApiBody({
    type: RecordViewDto,
    description: 'Entity type and ID to record as viewed',
    examples: {
      storeView: {
        summary: 'Record store view',
        description: 'Track when a user visits a store page',
        value: { entityType: 'STORE', entityId: 1 },
      },
      productView: {
        summary: 'Record product view',
        description: 'Track when a user views a product detail page',
        value: { entityType: 'PRODUCT', entityId: 42 },
      },
      promotionView: {
        summary: 'Record promotion view',
        description: 'Track when a user sees a promotion or deal',
        value: { entityType: 'PROMOTION', entityId: 7 },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'View recorded successfully. Returns the view record with timestamp.',
    type: ViewResponseDto,
    schema: {
      example: {
        id: 123,
        userId: 5,
        entityType: 'PRODUCT',
        entityId: 42,
        viewedAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - JWT token is missing, invalid, or expired',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid entity type or entity ID format',
    schema: {
      example: {
        statusCode: 400,
        message: ['entityType must be one of: STORE, PRODUCT, PROMOTION', 'entityId must be a positive number'],
        error: 'Bad Request',
      },
    },
  })
  async recordView(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: RecordViewDto,
  ): Promise<ViewResponseDto> {
    return this.viewService.recordView(
      req.user.sub,
      body.entityType,
      body.entityId,
    );
  }

  /**
   * List user's view history
   * 
   * Retrieves all view records for the authenticated user, with support for
   * filtering by entity type and pagination. Results are always ordered by
   * most recent views first (viewedAt DESC).
   * 
   * **Authentication:** Required (JWT Bearer token)
   * 
   * **Query Parameters:**
   * - `entityType` (optional): Filter to specific entity type (STORE, PRODUCT, or PROMOTION)
   * - `skip` (optional): Number of records to skip for pagination (default: 0)
   * - `take` (optional): Maximum number of records to return (default: unlimited, max: 100)
   * 
   * **Examples:**
   * ```
   * GET /views/list
   * // Returns all views for authenticated user
   * 
   * GET /views/list?entityType=PRODUCT
   * // Returns only product views
   * 
   * GET /views/list?entityType=PRODUCT&skip=0&take=20
   * // Returns first 20 product views (page 1)
   * 
   * GET /views/list?skip=20&take=20
   * // Returns views 21-40 (page 2)
   * ```
   * 
   * **Response:**
   * Array of view records:
   * ```json
   * [
   *   {
   *     "id": 123,
   *     "userId": 5,
   *     "entityType": "PRODUCT",
   *     "entityId": 42,
   *     "viewedAt": "2024-01-15T10:30:00.000Z"
   *   },
   *   {
   *     "id": 122,
   *     "userId": 5,
   *     "entityType": "STORE",
   *     "entityId": 1,
   *     "viewedAt": "2024-01-14T15:20:00.000Z"
   *   }
   * ]
   * ```
   * 
   * **Use Cases:**
   * - Display "Recently Viewed" section in UI
   * - Show user's browsing history
   * - Build view-based recommendations
   * - Analyze user interests and behavior
   * 
   * **Pagination Strategy:**
   * For infinite scroll:
   * ```typescript
   * // Load first page
   * let skip = 0;
   * const take = 20;
   * const views = await fetch(`/views/list?skip=${skip}&take=${take}`);
   * 
   * // Load next page
   * skip += take;
   * const moreViews = await fetch(`/views/list?skip=${skip}&take=${take}`);
   * ```
   * 
   * @param req - Express request object with authenticated user
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to array of view records, ordered by most recent first
   */
  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'List user view history',
    description:
      'Retrieves all views for the authenticated user with optional filtering by entity type and pagination support. ' +
      'Results are ordered by most recent views first. ' +
      'Useful for displaying "Recently Viewed" sections and analyzing user interests.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved view history. Returns array of view records ordered by viewedAt DESC.',
    type: [ViewResponseDto],
    schema: {
      example: [
        {
          id: 123,
          userId: 5,
          entityType: 'PRODUCT',
          entityId: 42,
          viewedAt: '2024-01-15T10:30:00.000Z',
        },
        {
          id: 122,
          userId: 5,
          entityType: 'STORE',
          entityId: 1,
          viewedAt: '2024-01-14T15:20:00.000Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - JWT token is missing, invalid, or expired',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  async listMyViews(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Query() query: ListViewsDto,
  ): Promise<ViewResponseDto[]> {
    return this.viewService.getUserViews(
      req.user.sub,
      query.entityType,
      query.skip,
      query.take,
    );
  }

  /**
   * Get view count for an entity (PUBLIC)
   * 
   * Returns the total number of unique users who have viewed a specific entity.
   * This is a public endpoint that doesn't require authentication, making it
   * suitable for displaying view counts on public-facing pages.
   * 
   * **Authentication:** Not required (public endpoint)
   * 
   * **URL Parameters:**
   * - `entityType`: Type of entity (STORE, PRODUCT, or PROMOTION)
   * - `entityId`: Numeric ID of the entity
   * 
   * **Examples:**
   * ```
   * GET /views/PRODUCT/42/count
   * // Returns view count for product 42
   * 
   * GET /views/STORE/1/count
   * // Returns view count for store 1
   * 
   * GET /views/PROMOTION/7/count
   * // Returns view count for promotion 7
   * ```
   * 
   * **Response:**
   * ```json
   * {
   *   "entityType": "PRODUCT",
   *   "entityId": 42,
   *   "viewCount": 1547
   * }
   * ```
   * 
   * **Important Notes:**
   * - Count represents **unique users**, not total view events
   * - Same user viewing multiple times counts as 1
   * - Count of 0 means no users have viewed the entity
   * - Public data - no sensitive information exposed
   * 
   * **Use Cases:**
   * - Display "X people viewed this" on product pages
   * - Show popularity indicators on store listings
   * - Rank entities by view count (trending items)
   * - Generate engagement analytics
   * - A/B testing effectiveness measurement
   * 
   * **Performance:**
   * - Fast COUNT query using indexed fields
   * - Can be cached on client side for better performance
   * - Safe to call frequently (lightweight operation)
   * 
   * **Client Integration:**
   * ```typescript
   * // No authentication needed
   * const response = await fetch('/views/PRODUCT/42/count');
   * const { viewCount } = await response.json();
   * console.log(`${viewCount} users viewed this product`);
   * ```
   * 
   * @param entityType - Type of entity (extracted from URL path)
   * @param entityId - ID of entity as string (will be parsed to number)
   * @returns Promise resolving to view count response
   */
  @Get(':entityType/:entityId/count')
  @ApiOperation({
    summary: 'Get entity view count (public)',
    description:
      'Returns the total number of unique users who have viewed a specific entity. ' +
      'PUBLIC ENDPOINT - No authentication required. ' +
      'The count represents unique users, not total views (same user viewing multiple times counts as 1). ' +
      'Useful for displaying popularity indicators on product, store, or promotion pages.',
  })
  @ApiParam({
    name: 'entityType',
    enum: EntityType,
    description: 'Type of entity to get view count for. Must be STORE, PRODUCT, or PROMOTION.',
    example: 'PRODUCT',
    required: true,
  })
  @ApiParam({
    name: 'entityId',
    type: Number,
    description: 'Numeric ID of the entity to get view count for. Must be a positive integer.',
    example: 42,
    required: true,
  })
  @ApiOkResponse({
    description: 'Successfully retrieved view count. Returns entity info and unique user count.',
    type: ViewCountResponseDto,
    schema: {
      example: {
        entityType: 'PRODUCT',
        entityId: 42,
        viewCount: 1547,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid entity type or entity ID format',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid entityType. Must be STORE, PRODUCT, or PROMOTION',
        error: 'Bad Request',
      },
    },
  })
  async getEntityViewCount(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ): Promise<ViewCountResponseDto> {
    const id = parseInt(entityId, 10);
    const viewCount = await this.viewService.getEntityViewCount(
      entityType,
      id,
    );

    return {
      entityType,
      entityId: id,
      viewCount,
    };
  }
}
