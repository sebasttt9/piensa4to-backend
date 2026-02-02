import { IsIn } from 'class-validator';

export class ApproveDashboardDto {
    @IsIn(['approved', 'rejected'])
    status: 'approved' | 'rejected';
}