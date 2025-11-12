import { cleanupExpiredTokens } from './jwt.utils';
import { authConfig } from '../config/jwt';

/**
 * Token cleanup scheduler
 */
export class TokenCleanupScheduler {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start periodic cleanup of expired tokens
   */
  static start(): void {
    if (this.isRunning) {
      console.log('Token cleanup scheduler is already running');
      return;
    }

    console.log('🧹 Starting token cleanup scheduler...');
    
    // Run cleanup immediately
    this.runCleanup();

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, authConfig.tokenCleanupInterval);

    this.isRunning = true;
    console.log(`✅ Token cleanup scheduler started (interval: ${authConfig.tokenCleanupInterval}ms)`);
  }

  /**
   * Stop periodic cleanup
   */
  static stop(): void {
    if (!this.isRunning) {
      console.log('Token cleanup scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('🛑 Token cleanup scheduler stopped');
  }

  /**
   * Run cleanup manually
   */
  static async runCleanup(): Promise<number> {
    try {
      const deletedCount = await cleanupExpiredTokens();
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} expired refresh tokens`);
      }
      return deletedCount;
    } catch (error) {
      console.error('❌ Token cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get scheduler status
   */
  static getStatus(): { isRunning: boolean; interval: number } {
    return {
      isRunning: this.isRunning,
      interval: authConfig.tokenCleanupInterval,
    };
  }
}

/**
 * Initialize token cleanup on application start
 */
export const initializeTokenCleanup = (): void => {
  // Start cleanup scheduler
  TokenCleanupScheduler.start();

  // Graceful shutdown
  const shutdown = () => {
    console.log('🔄 Shutting down token cleanup scheduler...');
    TokenCleanupScheduler.stop();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('beforeExit', shutdown);
};