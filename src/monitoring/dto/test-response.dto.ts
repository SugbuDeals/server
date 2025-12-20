import { ApiProperty } from '@nestjs/swagger';

export class TestPerformanceResponseDto {
  @ApiProperty({ example: 'Performance test completed' })
  message: string;

  @ApiProperty({ example: 200 })
  simulatedResponseTime: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  timestamp: string;

  @ApiProperty({ example: 1 })
  userId: number;
}

export class TestErrorResponseDto {
  @ApiProperty({ example: 'Test error - This is a test error for monitoring verification' })
  message: string;

  @ApiProperty({ example: 500 })
  statusCode: number;

  @ApiProperty({ example: true })
  test: boolean;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  timestamp: string;
}

