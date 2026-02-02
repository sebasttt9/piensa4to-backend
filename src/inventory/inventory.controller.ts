import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles.enum';
import { CreateInventoryItemDto, UpdateInventoryItemDto, ApproveInventoryItemDto } from './dto/inventory-item.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_DATA_CLIENT } from '../database/supabase.constants';
import { Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
    constructor(
        private readonly inventoryService: InventoryService,
        @Inject(SUPABASE_DATA_CLIENT)
        private readonly supabase: SupabaseClient,
    ) { }

    @Get('test')
    async testEndpoint() {
        // Crear algunos items de prueba con owner_id fijo para testing
        const testItems = [
            {
                owner_id: '550e8400-e29b-41d4-a716-446655440000', // UUID de prueba
                name: 'Producto de Prueba 1',
                code: 'TEST001',
                quantity: 100,
                pvp: 25.50,
                cost: 15.00,
                status: 'pending'
            },
            {
                owner_id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Producto de Prueba 2',
                code: 'TEST002',
                quantity: 50,
                pvp: 45.00,
                cost: 30.00,
                status: 'pending'
            },
            {
                owner_id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Producto de Prueba 3',
                code: 'TEST003',
                quantity: 75,
                pvp: 12.99,
                cost: 8.50,
                status: 'pending'
            }
        ];

        try {
            const { data, error } = await this.supabase
                .from('inventory_items')
                .upsert(testItems, { onConflict: 'code' });

            if (error) {
                console.error('Error creating test items:', error);
                return { error: error.message };
            }

            return { message: 'Test items created', count: testItems.length, data };
        } catch (err) {
            console.error('Exception creating test items:', err);
            return { error: 'Exception occurred' };
        }
    }

    @Patch('test/approve/:id')
    async testApproveItem(@Param('id') itemId: string, @Body() dto: { status: string }) {
        try {
            // First check if item exists
            const { data: existing, error: fetchError } = await this.supabase
                .from('inventory_items')
                .select('id')
                .eq('id', itemId)
                .single();

            if (fetchError || !existing) {
                return { error: 'Item not found', fetchError: fetchError?.message };
            }

            const { data, error } = await this.supabase
                .from('inventory_items')
                .update({
                    status: dto.status
                })
                .eq('id', itemId)
                .select()
                .single();

            if (error) {
                return { error: error.message, details: error };
            }

            return data;
        } catch (err) {
            return { error: 'Exception occurred', exception: err.message };
        }
    }

    @Get('debug')
    async debugEndpoint(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>) {
        return {
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            timestamp: new Date().toISOString()
        };
    }

    @Get()
    @Roles(UserRole.User, UserRole.Admin)
    getSummary(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>) {
        return this.inventoryService.getInventory(user.id, user.role, user.organizationId);
    }

    @Post(':datasetId/adjust')
    @Roles(UserRole.User, UserRole.Admin)
    adjustInventory(
        @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
        @Param('datasetId') datasetId: string,
        @Body() body: AdjustInventoryDto,
    ) {
        return this.inventoryService.adjustInventory(user.id, datasetId, body.amount, user.role, user.organizationId);
    }

    @Delete('adjustments')
    @Roles(UserRole.User, UserRole.Admin)
    resetAdjustments(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>) {
        return this.inventoryService.resetAdjustments(user.id, user.role, user.organizationId);
    }

    // Inventory Items endpoints
    @Post('items')
    @Roles(UserRole.User, UserRole.Admin)
    createItem(
        @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
        @Body() dto: CreateInventoryItemDto,
    ) {
        return this.inventoryService.createItem(user.id, dto, user.role, user.organizationId);
    }

    @Get('items')
    @Roles(UserRole.User, UserRole.Admin)
    getItems(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>) {
        console.log('GET /inventory/items called by user:', user.id, 'role:', user.role, 'email:', user.email, 'organizationId:', user.organizationId);
        return this.inventoryService.getItems(user.id, user.role, user.organizationId);
    }

    @Get('items/:id')
    @Roles(UserRole.User, UserRole.Admin)
    getItem(
        @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
        @Param('id') itemId: string,
    ) {
        return this.inventoryService.getItem(user.id, itemId, user.role, user.organizationId);
    }

    @Put('items/:id')
    @Roles(UserRole.User, UserRole.Admin)
    updateItem(
        @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
        @Param('id') itemId: string,
        @Body() dto: UpdateInventoryItemDto,
    ) {
        return this.inventoryService.updateItem(user.id, itemId, dto, user.role, user.organizationId);
    }

    @Patch('items/:id/approve')
    @Roles(UserRole.Admin)
    approveItem(
        @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
        @Param('id') itemId: string,
        @Body() dto: ApproveInventoryItemDto,
    ) {
        return this.inventoryService.approveItem(user.id, itemId, dto.status, user.role, user.organizationId);
    }

    @Delete('items/:id')
    @Roles(UserRole.User, UserRole.Admin)
    deleteItem(
        @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
        @Param('id') itemId: string,
    ) {
        return this.inventoryService.deleteItem(user.id, itemId, user.role, user.organizationId);
    }
}
