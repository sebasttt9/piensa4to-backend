import type { UserEntity } from '../users/entities/user.entity';
import { CommerceService, type CommerceOverview } from './commerce.service';
import { RegisterSaleDto } from './dto/register-sale.dto';
export declare class CommerceController {
    private readonly commerceService;
    constructor(commerceService: CommerceService);
    getOverview(user: Omit<UserEntity, 'passwordHash'>): Promise<CommerceOverview>;
    registerSale(user: Omit<UserEntity, 'passwordHash'>, dto: RegisterSaleDto): Promise<{
        orderId: `${string}-${string}-${string}-${string}-${string}`;
        orderTotal: number;
        currencyCode: string;
        quantity: number;
        remainingQuantity: number;
        registeredAt: string;
    }>;
}
