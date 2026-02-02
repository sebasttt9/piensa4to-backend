import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
export declare class OrganizationsController {
    private readonly organizationsService;
    constructor(organizationsService: OrganizationsService);
    create(createOrganizationDto: CreateOrganizationDto): Promise<import("./entities/organization.entity").OrganizationEntity>;
    findAll(): Promise<import("./entities/organization.entity").OrganizationEntity[]>;
    findOne(id: string): Promise<import("./entities/organization.entity").OrganizationEntity>;
    update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<import("./entities/organization.entity").OrganizationEntity>;
    remove(id: string): Promise<void>;
}
