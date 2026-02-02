import { DashboardsService } from './dashboards.service';
import type { UserEntity } from '../users/entities/user.entity';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { ShareDashboardDto } from './dto/share-dashboard.dto';
import { ApproveDashboardDto } from './dto/approve-dashboard.dto';
import type { Response } from 'express';
export declare class DashboardsController {
    private readonly dashboardsService;
    constructor(dashboardsService: DashboardsService);
    private validateOrganization;
    create(user: Omit<UserEntity, 'passwordHash'>, dto: CreateDashboardDto): Promise<import("./entities/dashboard.entity").DashboardEntity>;
    findAll(user: Omit<UserEntity, 'passwordHash'>, page?: number, limit?: number): Promise<{
        data: import("./entities/dashboard.entity").DashboardEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(user: Omit<UserEntity, 'passwordHash'>, id: string): Promise<import("./entities/dashboard.entity").DashboardEntity>;
    update(user: Omit<UserEntity, 'passwordHash'>, id: string, dto: UpdateDashboardDto): Promise<import("./entities/dashboard.entity").DashboardEntity>;
    share(user: Omit<UserEntity, 'passwordHash'>, id: string, dto: {
        isPublic: boolean;
    }): Promise<import("./entities/dashboard.entity").DashboardEntity>;
    shareWithContact(user: Omit<UserEntity, 'passwordHash'>, id: string, dto: ShareDashboardDto): Promise<import("./dashboards.service").DashboardShareEntity>;
    remove(user: Omit<UserEntity, 'passwordHash'>, id: string): Promise<void>;
    export(user: Omit<UserEntity, 'passwordHash'>, id: string, format: string | undefined, res: Response): Promise<Response<any, Record<string, any>>>;
    approve(user: Omit<UserEntity, 'passwordHash'>, id: string, dto: ApproveDashboardDto): Promise<import("./entities/dashboard.entity").DashboardEntity>;
}
