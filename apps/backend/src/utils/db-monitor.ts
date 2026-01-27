import { PrismaClient } from '@prisma/client';

/**
 * Database connection monitor utility
 * Helps track and manage database connections to prevent exhaustion
 */
export class DbConnectionMonitor {
  private static instance: DbConnectionMonitor;
  private prisma: PrismaClient;
  private activeConnections: number = 0;
  private maxConnections: number = 10; // Default max connections
  private monitorInterval: NodeJS.Timeout | null = null;

  private constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public static getInstance(prisma: PrismaClient): DbConnectionMonitor {
    if (!DbConnectionMonitor.instance) {
      DbConnectionMonitor.instance = new DbConnectionMonitor(prisma);
    }
    return DbConnectionMonitor.instance;
  }

  /**
   * Set the maximum number of allowed connections
   */
  public setMaxConnections(max: number): void {
    this.maxConnections = max;
  }

  /**
   * Start monitoring database connections
   */
  public startMonitoring(intervalMs: number = 30000): void { // Default to 30 seconds
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.monitorInterval = setInterval(async () => {
      try {
        await this.checkConnectionHealth();
      } catch (error) {
        console.error('Database monitoring error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring database connections
   */
  public stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Check database connection health
   */
  private async checkConnectionHealth(): Promise<void> {
    try {
      // Simple query to test connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Log current connection status
      console.log(`[DB Monitor] Connection healthy. Max allowed: ${this.maxConnections}`);
    } catch (error) {
      console.error('[DB Monitor] Connection health check failed:', error);
    }
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): { active: number; maxAllowed: number; healthy: boolean } {
    return {
      active: this.activeConnections,
      maxAllowed: this.maxConnections,
      healthy: true // Simplified - in reality, you'd check actual DB status
    };
  }

  /**
   * Track a new active connection (increment counter)
   */
  public incrementConnection(): void {
    this.activeConnections++;
    this.checkConnectionLimit();
  }

  /**
   * Release a connection (decrement counter)
   */
  public decrementConnection(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  /**
   * Check if we're approaching the connection limit
   */
  private checkConnectionLimit(): void {
    const threshold = this.maxConnections * 0.8; // 80% threshold
    
    if (this.activeConnections >= threshold) {
      console.warn(
        `[DB Monitor] Connection threshold approaching: ${this.activeConnections}/${this.maxConnections}`
      );
    }
  }
}