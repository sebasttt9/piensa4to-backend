import { ConfigService } from '@nestjs/config';
export declare class CacheService {
    private configService;
    private logger;
    private redisClient;
    private memoryCache;
    private useRedis;
    constructor(configService: ConfigService);
    private initialize;
    set(key: string, value: any, ttl?: number): Promise<void>;
    get<T = any>(key: string): Promise<T | null>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    getOrSet<T = any>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T>;
}
