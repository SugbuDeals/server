import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { EntityType } from 'generated/prisma';

/**
 * Record View Data Transfer Object
 * 
 * DTO for recording a user's view of an entity (Store, Product, or Promotion).
 * Used in POST requests to track when users view specific entities.
 * 
 * **Behavior:**
 * - If the user has already viewed this entity, the viewedAt timestamp will be updated
 * - Otherwise, a new view record will be created
 * - Each user can only have one view record per entity (enforced by unique constraint)
 * 
 * **Use Cases:**
 * - Track user engagement with products, stores, or promotions
 * - Build recommendation systems based on viewing history
 * - Display "recently viewed" features in the UI
 * - Generate analytics on popular items
 * 
 * @example
 * ```typescript
 * // Recording a product view
 * const viewDto: RecordViewDto = {
 *   entityType: EntityType.PRODUCT,
 *   entityId: 42
 * };
 * 
 * // Recording a store view
 * const storeViewDto: RecordViewDto = {
 *   entityType: EntityType.STORE,
 *   entityId: 1
 * };
 * 
 * // Recording a promotion view
 * const promoViewDto: RecordViewDto = {
 *   entityType: EntityType.PROMOTION,
 *   entityId: 7
 * };
 * ```
 */
export class RecordViewDto {
  /**
   * Type of entity being viewed
   * 
   * Specifies which type of entity the user is viewing. This determines
   * how the view is categorized and what analytics can be generated.
   * 
   * **Valid Values:**
   * - `STORE` - User viewed a store's main page
   * - `PRODUCT` - User viewed a product detail page
   * - `PROMOTION` - User viewed a promotion or deal
   * 
   * @example EntityType.PRODUCT
   */
  @ApiProperty({
    enum: EntityType,
    example: EntityType.PRODUCT,
    description: 'Type of entity being viewed. Must be one of: STORE (store page view), PRODUCT (product detail view), or PROMOTION (promotion/deal view)',
    enumName: 'EntityType',
    required: true,
  })
  @IsEnum(EntityType, {
    message: 'entityType must be one of: STORE, PRODUCT, PROMOTION',
  })
  entityType!: EntityType;

  /**
   * ID of the entity being viewed
   * 
   * The unique identifier of the store, product, or promotion being viewed.
   * Must correspond to an existing entity of the specified entityType.
   * 
   * **Validation:**
   * - Must be a positive integer (> 0)
   * - Should reference an existing entity (validated at service layer)
   * 
   * @example 42
   */
  @ApiProperty({
    example: 42,
    description: 'Unique identifier of the entity being viewed. Must be a positive integer corresponding to an existing store, product, or promotion.',
    minimum: 1,
    type: Number,
    required: true,
  })
  @IsInt()
  @IsPositive()
  entityId!: number;
}
