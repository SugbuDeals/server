import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

/**
 * Route Tracking Service
 * 
 * Tracks route usage in memory for live monitoring.
 * Provides real-time statistics about which routes are being used.
 */
@Injectable()
export class RouteTrackingService implements OnModuleDestroy {
  private readonly logger = new Logger(RouteTrackingService.name);
  
  // In-memory storage for route usage statistics
  private routeStats: Map<string, RouteStat> = new Map();
  
  // Maximum age for route stats (1 hour)
  private readonly MAX_AGE_MS = 60 * 60 * 1000;
  
  // Cleanup interval (5 minutes)
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval to remove old stats
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldStats();
    }, 5 * 60 * 1000);
  }

  /**
   * Track a route usage
   */
  trackRoute(endpoint: string, method: string, responseTime: number, statusCode: number): void {
    const key = `${method}:${endpoint}`;
    const now = Date.now();
    
    const existing = this.routeStats.get(key);
    
    if (existing) {
      existing.count++;
      existing.lastUsed = now;
      existing.totalResponseTime += responseTime;
      existing.avgResponseTime = Math.round(existing.totalResponseTime / existing.count);
      existing.maxResponseTime = Math.max(existing.maxResponseTime, responseTime);
      existing.minResponseTime = Math.min(existing.minResponseTime, responseTime);
      
      // Track status codes
      const statusKey = statusCode.toString();
      existing.statusCodes[statusKey] = (existing.statusCodes[statusKey] || 0) + 1;
      
      // Track errors
      if (statusCode >= 400) {
        existing.errorCount++;
      }
    } else {
      this.routeStats.set(key, {
        endpoint,
        method,
        count: 1,
        firstSeen: now,
        lastUsed: now,
        totalResponseTime: responseTime,
        avgResponseTime: responseTime,
        maxResponseTime: responseTime,
        minResponseTime: responseTime,
        statusCodes: { [statusCode.toString()]: 1 },
        errorCount: statusCode >= 400 ? 1 : 0,
      });
    }
  }

  /**
   * Get all route statistics
   */
  getAllRouteStats(): RouteStat[] {
    this.cleanupOldStats();
    
    return Array.from(this.routeStats.values())
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get route statistics for a specific endpoint
   */
  getRouteStat(endpoint: string, method?: string): RouteStat | null {
    const key = method ? `${method}:${endpoint}` : null;
    
    if (key) {
      return this.routeStats.get(key) || null;
    }
    
    // If no method specified, find any route matching the endpoint
    for (const [routeKey, stat] of this.routeStats.entries()) {
      if (stat.endpoint === endpoint) {
        return stat;
      }
    }
    
    return null;
  }

  /**
   * Get summary statistics
   */
  getSummary(): RouteSummary {
    this.cleanupOldStats();
    
    const stats = Array.from(this.routeStats.values());
    const totalRequests = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalErrors = stats.reduce((sum, stat) => sum + stat.errorCount, 0);
    const uniqueRoutes = stats.length;
    
    const avgResponseTime = stats.length > 0
      ? Math.round(stats.reduce((sum, stat) => sum + stat.avgResponseTime, 0) / stats.length)
      : 0;
    
    const mostUsedRoutes = stats
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(stat => ({
        route: `${stat.method} ${stat.endpoint}`,
        count: stat.count,
        avgResponseTime: stat.avgResponseTime,
      }));
    
    const slowestRoutes = stats
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10)
      .map(stat => ({
        route: `${stat.method} ${stat.endpoint}`,
        avgResponseTime: stat.avgResponseTime,
        maxResponseTime: stat.maxResponseTime,
      }));
    
    const errorRoutes = stats
      .filter(stat => stat.errorCount > 0)
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10)
      .map(stat => ({
        route: `${stat.method} ${stat.endpoint}`,
        errorCount: stat.errorCount,
        totalRequests: stat.count,
        errorRate: Math.round((stat.errorCount / stat.count) * 100),
      }));
    
    return {
      totalRequests,
      totalErrors,
      uniqueRoutes,
      avgResponseTime,
      mostUsedRoutes,
      slowestRoutes,
      errorRoutes,
      timestamp: new Date(),
    };
  }

  /**
   * Clear all statistics
   */
  clearStats(): void {
    this.routeStats.clear();
    this.logger.log('Route statistics cleared');
  }

  /**
   * Cleanup old statistics
   */
  private cleanupOldStats(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, stat] of this.routeStats.entries()) {
      if (now - stat.lastUsed > this.MAX_AGE_MS) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.routeStats.delete(key));
    
    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} old route statistics`);
    }
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export interface RouteStat {
  endpoint: string;
  method: string;
  count: number;
  firstSeen: number;
  lastUsed: number;
  totalResponseTime: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  statusCodes: Record<string, number>;
  errorCount: number;
}

export interface RouteSummary {
  totalRequests: number;
  totalErrors: number;
  uniqueRoutes: number;
  avgResponseTime: number;
  mostUsedRoutes: Array<{
    route: string;
    count: number;
    avgResponseTime: number;
  }>;
  slowestRoutes: Array<{
    route: string;
    avgResponseTime: number;
    maxResponseTime: number;
  }>;
  errorRoutes: Array<{
    route: string;
    errorCount: number;
    totalRequests: number;
    errorRate: number;
  }>;
  timestamp: Date;
}
