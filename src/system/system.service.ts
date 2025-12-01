import { Injectable } from '@nestjs/common';

export type SystemMode = 'basic' | 'advanced';

export interface SystemConfig {
  enabled: boolean;
  mode: SystemMode;
  maxResults: number;
}

export interface SystemAnalytics {
  totalRequests: number;
  totalErrors: number;
  lastActivityAt: string | null; // ISO string
}

@Injectable()
export class SystemService {
  // In-memory only, no background loops, no external dependencies
  private config: SystemConfig = {
    enabled: true,
    mode: 'basic',
    maxResults: 3,
  };

  private analytics: SystemAnalytics = {
    totalRequests: 0,
    totalErrors: 0,
    lastActivityAt: null,
  };

  // -------- Enable / Disable System --------

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  // -------- Configuration Management --------

  getConfig(): SystemConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<Omit<SystemConfig, 'enabled'>>): SystemConfig {
    // Minimal validation, keep it simple
    if (partial.maxResults !== undefined && partial.maxResults < 1) {
      partial.maxResults = 1;
    }

    this.config = {
      ...this.config,
      ...partial,
    };

    return this.getConfig();
  }

  // -------- Analytics (very lightweight) --------

  getAnalytics(): SystemAnalytics {
    return { ...this.analytics };
  }

  trackRequest(success: boolean): void {
    this.analytics.totalRequests += 1;
    if (!success) {
      this.analytics.totalErrors += 1;
    }
    this.analytics.lastActivityAt = new Date().toISOString();
  }
}


