import { ApiProperty } from '@nestjs/swagger';

export class ErrorStatsDto {
  @ApiProperty({ example: 150 })
  totalErrors: number;

  @ApiProperty({ example: 50 })
  totalWarnings: number;

  @ApiProperty({ example: 10 })
  errorsLast24h: number;

  @ApiProperty({ example: 5 })
  warningsLast24h: number;

  @ApiProperty({ example: ['/product/123', '/store/456'] })
  topErrorEndpoints: string[];

  @ApiProperty({ example: { '404': 50, '500': 30, '400': 20 } })
  errorsByStatusCode: Record<string, number>;
}

export class PerformanceStatsDto {
  @ApiProperty({ example: 150 })
  avgResponseTime: number;

  @ApiProperty({ example: 500 })
  maxResponseTime: number;

  @ApiProperty({ example: 50 })
  minResponseTime: number;

  @ApiProperty({ example: 1000 })
  totalRequests: number;

  @ApiProperty({ example: ['/product', '/store'] })
  slowestEndpoints: string[];

  @ApiProperty({ example: { '200': 800, '404': 100, '500': 50 } })
  requestsByStatusCode: Record<string, number>;
}

export class DashboardStatsDto {
  @ApiProperty({ type: ErrorStatsDto })
  errors: ErrorStatsDto;

  @ApiProperty({ type: PerformanceStatsDto })
  performance: PerformanceStatsDto;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  generatedAt: Date;
}
