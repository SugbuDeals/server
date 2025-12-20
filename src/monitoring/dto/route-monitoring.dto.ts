import { ApiProperty } from '@nestjs/swagger';

export class RouteStatDto {
  @ApiProperty({ description: 'Endpoint path', example: '/product' })
  endpoint: string;

  @ApiProperty({ description: 'HTTP method', example: 'GET' })
  method: string;

  @ApiProperty({ description: 'Total number of requests', example: 150 })
  count: number;

  @ApiProperty({ description: 'Timestamp when route was first seen', example: 1234567890 })
  firstSeen: number;

  @ApiProperty({ description: 'Timestamp when route was last used', example: 1234567890 })
  lastUsed: number;

  @ApiProperty({ description: 'Average response time in milliseconds', example: 150 })
  avgResponseTime: number;

  @ApiProperty({ description: 'Maximum response time in milliseconds', example: 500 })
  maxResponseTime: number;

  @ApiProperty({ description: 'Minimum response time in milliseconds', example: 50 })
  minResponseTime: number;

  @ApiProperty({ description: 'Status code distribution', example: { '200': 140, '404': 10 } })
  statusCodes: Record<string, number>;

  @ApiProperty({ description: 'Number of errors (status >= 400)', example: 10 })
  errorCount: number;
}

export class RouteSummaryDto {
  @ApiProperty({ description: 'Total number of requests', example: 1000 })
  totalRequests: number;

  @ApiProperty({ description: 'Total number of errors', example: 50 })
  totalErrors: number;

  @ApiProperty({ description: 'Number of unique routes', example: 25 })
  uniqueRoutes: number;

  @ApiProperty({ description: 'Average response time across all routes', example: 150 })
  avgResponseTime: number;

  @ApiProperty({
    description: 'Most used routes',
    type: [Object],
    example: [
      { route: 'GET /product', count: 150, avgResponseTime: 120 },
      { route: 'POST /auth/login', count: 100, avgResponseTime: 200 },
    ],
  })
  mostUsedRoutes: Array<{
    route: string;
    count: number;
    avgResponseTime: number;
  }>;

  @ApiProperty({
    description: 'Slowest routes',
    type: [Object],
    example: [
      { route: 'POST /ai/chat', avgResponseTime: 500, maxResponseTime: 2000 },
      { route: 'GET /product', avgResponseTime: 200, maxResponseTime: 500 },
    ],
  })
  slowestRoutes: Array<{
    route: string;
    avgResponseTime: number;
    maxResponseTime: number;
  }>;

  @ApiProperty({
    description: 'Routes with errors',
    type: [Object],
    example: [
      { route: 'GET /product/999', errorCount: 10, totalRequests: 10, errorRate: 100 },
      { route: 'POST /auth/login', errorCount: 5, totalRequests: 100, errorRate: 5 },
    ],
  })
  errorRoutes: Array<{
    route: string;
    errorCount: number;
    totalRequests: number;
    errorRate: number;
  }>;

  @ApiProperty({ description: 'Timestamp when summary was generated' })
  timestamp: Date;
}
