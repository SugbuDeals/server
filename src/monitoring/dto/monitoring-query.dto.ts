import { IsOptional, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeRange {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class MonitoringQueryDto {
  @ApiPropertyOptional({
    description: 'Time range for filtering data',
    enum: TimeRange,
    example: TimeRange.DAY,
  })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange;

  @ApiPropertyOptional({
    description: 'Start date for custom time range (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom time range (ISO 8601 format)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by specific endpoint',
    example: '/product',
  })
  @IsOptional()
  endpoint?: string;

  @ApiPropertyOptional({
    description: 'Filter by HTTP method',
    example: 'GET',
  })
  @IsOptional()
  method?: string;

  @ApiPropertyOptional({
    description: 'Filter by error level (error, warn, debug)',
    example: 'error',
    enum: ['error', 'warn', 'debug'],
  })
  @IsOptional()
  @IsEnum(['error', 'warn', 'debug'])
  level?: string;
}
