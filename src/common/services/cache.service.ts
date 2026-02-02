import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cache service with optional Redis support
 * Falls back to in-memory cache if Redis is disabled
 */
@Injectable()
export class CacheService {
    private logger = new Logger('CacheService');
    private redisClient: any = null;
    private memoryCache = new Map<string, { value: any; expiredAt: number }>();
    private useRedis = false;

    constructor(private configService: ConfigService) {
        this.initialize();
    }

    private initialize() {
        const redisEnabled = this.configService.get('redis.enabled', false);

        if (redisEnabled) {
            // Initialize Redis client (requires redis module)
            // This is a placeholder - implement actual Redis client initialization
            this.logger.warn('Redis cache enabled but client not initialized. Using in-memory cache.');
            this.useRedis = false;
        } else {
            this.logger.log('Using in-memory cache. For production, enable Redis.');
        }
    }

    /**
     * Set a cache value
     */
    async set(key: string, value: any, ttl: number = 3600): Promise<void> {
        if (this.useRedis && this.redisClient) {
            // Redis implementation
            await this.redisClient.setex(key, ttl, JSON.stringify(value));
        } else {
            // In-memory implementation
            const expiredAt = Date.now() + ttl * 1000;
            this.memoryCache.set(key, { value, expiredAt });
        }
    }

    /**
     * Get a cache value
     */
    async get<T = any>(key: string): Promise<T | null> {
        if (this.useRedis && this.redisClient) {
            // Redis implementation
            const data = await this.redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } else {
            // In-memory implementation
            const cached = this.memoryCache.get(key);
            if (!cached) return null;

            // Check expiration
            if (Date.now() > cached.expiredAt) {
                this.memoryCache.delete(key);
                return null;
            }

            return cached.value as T;
        }
    }

    /**
     * Delete a cache value
     */
    async delete(key: string): Promise<void> {
        if (this.useRedis && this.redisClient) {
            await this.redisClient.del(key);
        } else {
            this.memoryCache.delete(key);
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        if (this.useRedis && this.redisClient) {
            await this.redisClient.flushdb();
        } else {
            this.memoryCache.clear();
        }
    }

    /**
     * Get or set cache value with loader function
     */
    async getOrSet<T = any>(
        key: string,
        loader: () => Promise<T>,
        ttl: number = 3600,
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached) {
            return cached;
        }

        const value = await loader();
        await this.set(key, value, ttl);
        return value;
    }
}
