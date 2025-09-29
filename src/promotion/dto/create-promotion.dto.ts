import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  title: string;

  @IsString()
  type: string;

  @IsString()
  description: string;

  @IsDateString()
  @IsOptional()
  startsAt?: Date;

  @IsDateString()
  @IsOptional()
  endsAt?: Date;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsNumber()
  discount: number;

  @IsNumber()
  productId: number;
}