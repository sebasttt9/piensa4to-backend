import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import type { UserEntity } from '../users/entities/user.entity';
export declare class IssuesController {
    private readonly issuesService;
    constructor(issuesService: IssuesService);
    create(createIssueDto: CreateIssueDto, user: UserEntity): Promise<any>;
    findAll(user: Omit<UserEntity, 'passwordHash'>): Promise<any[]>;
    findOne(id: string, user: Omit<UserEntity, 'passwordHash'>): Promise<any>;
    update(id: string, updateIssueDto: UpdateIssueDto, user: Omit<UserEntity, 'passwordHash'>): Promise<any>;
    remove(id: string, user: Omit<UserEntity, 'passwordHash'>): Promise<void>;
}
