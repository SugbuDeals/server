import { ApiProperty } from '@nestjs/swagger';

export class ErrorLogResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'error' })
  level: string;

  @ApiProperty({ example: 'Product not found' })
  message: string;

  @ApiProperty({ example: 'Error: Product not found\n    at ProductService.findOne...', required: false })
  stack?: string;

  @ApiProperty({ example: '/product/123', required: false })
  endpoint?: string;

  @ApiProperty({ example: 'GET', required: false })
  method?: string;

  @ApiProperty({ example: 1, required: false })
  userId?: number;

  @ApiProperty({ example: 404, required: false })
  statusCode?: number;

  @ApiProperty({ example: { body: {}, query: {} }, required: false })
  metadata?: any;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;
}
