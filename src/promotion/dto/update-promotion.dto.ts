import { PartialType } from '@nestjs/swagger';
import { CreatePromotionDto } from './create-promotion.dto';

/**
 * Update Promotion Data Transfer Object
 * 
 * DTO for updating existing promotions.
 * Extends CreatePromotionDto with all fields optional.
 * Only provided fields will be updated.
 */
export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}