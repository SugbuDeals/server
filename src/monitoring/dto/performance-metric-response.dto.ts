import { ApiProperty } from '@nestjs/swagger';

export class PerformanceMetricResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '/product' })
  endpoint: string;

  @ApiProperty({ example: 'GET' })
  method: string;

  @ApiProperty({ example: 150 })
  responseTime: number;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 1, required: false })
  userId?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;
}
