import { Inject, Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../common/constants/roles.enum';
import { SUPABASE_CLIENT, SUPABASE_DATA_CLIENT } from '../database/supabase.constants';
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { UserEntity } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssignOrganizationDto } from './dto/assign-organization.dto';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password_hash: string;
  approved: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  description: string | null;
  location?: string | null;
  owner: string | null;
  ci_ruc: string | null;
  business_email?: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    @Inject(SUPABASE_DATA_CLIENT)
    private readonly supabaseData: SupabaseClient,
  ) { }

  private readonly tableName = 'users';

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    try {
      const email = createUserDto.email.toLowerCase();
      const existing = await this.findByEmail(email);
      if (existing) {
        throw new ConflictException('El correo ya está registrado');
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert({
          email,
          name: createUserDto.name,
          role: createUserDto.role ?? UserRole.User,
          password_hash: hashedPassword,
          approved: createUserDto.role === UserRole.SuperAdmin ? true : false,
          organization_id: createUserDto.organizationId ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error de Supabase al insertar usuario:', error);
        if (error.code === '23505') {
          throw new ConflictException('El correo ya está registrado');
        }
        throw new InternalServerErrorException('No se pudo crear el usuario');
      }

      if (!data) {
        throw new InternalServerErrorException('No se pudo crear el usuario');
      }

      return this.toUserEntity(data as UserRow);
    } catch (error) {
      console.error('Error creando usuario:', error);
      console.error('Detalles del error:', error.message, error.details, error.hint);
      throw new InternalServerErrorException('No se pudo crear el usuario');
    }
  }

  async findAll(): Promise<Array<Omit<UserEntity, 'passwordHash'>>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('No se pudieron listar los usuarios');
    }

    return ((data ?? []) as UserRow[]).map((row) => this.toPublicUser(row));
  }

  async findById(id: string): Promise<Omit<UserEntity, 'passwordHash'>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('No se pudo obtener el usuario');
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.toPublicUser(data as UserRow);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('No se pudo consultar el usuario');
    }

    if (!data) {
      return null;
    }

    return this.toUserEntity(data as UserRow);
  }

  async update(id: string, changes: UpdateUserDto): Promise<Omit<UserEntity, 'passwordHash'>> {
    if (changes.email) {
      const existing = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('email', changes.email.toLowerCase())
        .neq('id', id)
        .maybeSingle();

      if (existing.data) {
        throw new ConflictException('El correo ya está registrado');
      }
      if (existing.error && existing.error.code !== 'PGRST116') {
        throw new InternalServerErrorException('No se pudo actualizar el usuario');
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (changes.email) {
      updatePayload.email = changes.email.toLowerCase();
    }

    if (changes.password) {
      updatePayload.password_hash = await bcrypt.hash(changes.password, 12);
    }

    if (changes.name) {
      updatePayload.name = changes.name;
    }
    if (changes.role) {
      updatePayload.role = changes.role;
    }
    if (changes.approved !== undefined) {
      updatePayload.approved = changes.approved;
    }
    if (changes.organizationId !== undefined) {
      updatePayload.organization_id = changes.organizationId ?? null;
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.findById(id);
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ ...updatePayload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('No se pudo actualizar el usuario');
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.toPublicUser(data as UserRow);
  }

  async assignOrganization(id: string, dto: AssignOrganizationDto): Promise<Omit<UserEntity, 'passwordHash'>> {
    const { data: existingUser, error: existingUserError } = await this.supabase
      .from(this.tableName)
      .select('role')
      .eq('id', id)
      .maybeSingle();

    if (existingUserError) {
      console.error('Supabase error fetching user before assignment:', existingUserError);
      throw new InternalServerErrorException('No se pudo verificar el usuario antes de asignar la organización');
    }

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const currentRole = (existingUser.role as UserRole) ?? UserRole.User;

    const { data: primaryOrg, error: primaryError } = await this.supabase
      .from('organizations')
      .select('id, name, description, owner, ci_ruc, created_at, updated_at')
      .eq('id', dto.organizationId)
      .maybeSingle();

    if (primaryError && primaryError.code !== 'PGRST116') {
      console.error('Supabase error verifying organization assignment (primary DB):', primaryError);
      throw new InternalServerErrorException('No se pudo verificar la organización');
    }

    if (!primaryOrg) {
      const { data: dataOrg, error: dataError } = await this.supabaseData
        .from('organizations')
        .select('id, name, description, location, owner, ci_ruc, business_email, created_at, updated_at')
        .eq('id', dto.organizationId)
        .maybeSingle();

      if (dataError && dataError.code !== 'PGRST116') {
        console.error('Supabase error verifying organization assignment (datasets DB):', dataError);
        throw new InternalServerErrorException('No se pudo verificar la organización');
      }

      if (!dataOrg) {
        throw new NotFoundException('Organización no encontrada');
      }

      const record = dataOrg as OrganizationRow;
      const syncPayload: Record<string, unknown> = {
        id: record.id,
        name: record.name,
        description: record.description,
        owner: record.owner,
        ci_ruc: record.ci_ruc,
        created_at: record.created_at,
        updated_at: record.updated_at,
      };

      const { error: syncError } = await this.supabase
        .from('organizations')
        .upsert(syncPayload);

      if (syncError) {
        console.error('Supabase error syncing organization into primary DB:', syncError);
        throw new InternalServerErrorException('No se pudo sincronizar la organización seleccionada');
      }

      // nothing else needed; record now exists in primary DB
    }

    const approve = dto.approve ?? (dto.makeAdmin ? true : undefined);

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (currentRole !== UserRole.SuperAdmin) {
      updatePayload.organization_id = dto.organizationId;
    }

    if (dto.makeAdmin && currentRole !== UserRole.SuperAdmin) {
      updatePayload.role = UserRole.Admin;
    }

    if (approve !== undefined) {
      updatePayload.approved = approve;
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23503') {
        throw new BadRequestException('La organización seleccionada no existe o fue eliminada. Vuelve a crearla antes de asignar usuarios.');
      }
      console.error('Supabase error assigning organization to user:', error);
      throw new InternalServerErrorException('No se pudo asignar la organización al usuario');
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.toPublicUser(data as UserRow);
  }

  async updateProfile(id: string, changes: UpdateProfileDto): Promise<Omit<UserEntity, 'passwordHash'>> {
    const updatePayload: Record<string, unknown> = {};

    if (changes.name) {
      updatePayload.name = changes.name;
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.findById(id);
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('No se pudo actualizar el perfil');
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.toPublicUser(data as UserRow);
  }

  async removeOrganization(id: string): Promise<Omit<UserEntity, 'passwordHash'>> {
    // Fetch current role and organization
    const { data: existingUser, error: existingUserError } = await this.supabase
      .from(this.tableName)
      .select('id, role, organization_id')
      .eq('id', id)
      .maybeSingle();

    if (existingUserError) {
      console.error('Supabase error fetching user before removing organization:', existingUserError);
      throw new InternalServerErrorException('No se pudo verificar el usuario antes de quitar la organización');
    }

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const currentRole = (existingUser.role as UserRole) ?? UserRole.User;

    // Build update payload: solo quitar organización sin cambiar rol ni aprobación
    const updatePayload: Record<string, unknown> = {
      organization_id: null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Supabase error removing organization from user:', error);
      throw new InternalServerErrorException('No se pudo quitar la organización del usuario');
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.toPublicUser(data as UserRow);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('No se pudo obtener el usuario');
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const userRow = data as UserRow;
    const isValid = await bcrypt.compare(currentPassword, userRow.password_hash ?? '');
    if (!isValid) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const { error: updateError } = await this.supabase
      .from(this.tableName)
      .update({ password_hash: hashedPassword })
      .eq('id', id);

    if (updateError) {
      throw new InternalServerErrorException('No se pudo actualizar la contraseña');
    }
  }

  async remove(id: string): Promise<void> {
    const target = await this.supabase
      .from(this.tableName)
      .select('id, email')
      .eq('id', id)
      .maybeSingle();

    if (target.error) {
      console.error('Error obteniendo usuario antes de eliminar:', target.error);
      throw new InternalServerErrorException('No se pudo preparar la eliminación del usuario');
    }

    if (!target.data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const userEmail = (target.data as { email?: string }).email;

    await this.cleanupUserRelations(id, userEmail);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error eliminando usuario en Supabase:', error);
      throw new BadRequestException(this.resolveUserDeleteError(error));
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  private async cleanupUserRelations(userId: string, userEmail?: string): Promise<void> {
    await Promise.all([
      this.executeCleanup(
        this.supabase
          .from('organizations')
          .update({ owner: null })
          .eq('owner', userId),
        'organizations.resetOwner',
      ),
      this.executeCleanup(
        this.supabaseData
          .from('organizations')
          .update({ owner: null })
          .eq('owner', userId),
        'organizationsData.resetOwner',
      ),
    ]);

    await this.cleanupClientRelations(this.supabaseData, 'data', userId, { userEmail, removeUserRecord: true });
    await this.cleanupClientRelations(this.supabase, 'primary', userId, { removeUserRecord: false });
  }

  private async cleanupClientRelations(
    client: SupabaseClient,
    label: string,
    userId: string,
    options: { removeUserRecord: boolean; userEmail?: string },
  ): Promise<void> {
    const dashboardIds = await this.collectIds(
      client
        .from('dashboards')
        .select('id')
        .eq('owner_id', userId),
      `dashboards.fetchIds.${label}`,
    );

    const datasetIds = await this.collectIds(
      client
        .from('datasets')
        .select('id')
        .eq('owner_id', userId),
      `datasets.fetchIds.${label}`,
    );

    const inventoryItemIds = await this.collectIds(
      client
        .from('inventory_items')
        .select('id')
        .eq('owner_id', userId),
      `inventory_items.fetchIds.${label}`,
    );

    if (dashboardIds.length > 0) {
      await this.executeCleanup(
        client
          .from('dashboard_datasets')
          .delete()
          .in('dashboard_id', dashboardIds),
        `dashboard_datasets.removeByDashboard.${label}`,
      );

      await this.executeCleanup(
        client
          .from('dashboard_shares')
          .delete()
          .in('dashboard_id', dashboardIds),
        `dashboard_shares.removeByDashboard.${label}`,
      );
    }

    await this.executeCleanup(
      client
        .from('dashboard_shares')
        .delete()
        .eq('owner_id', userId),
      `dashboard_shares.removeByOwner.${label}`,
    );

    await this.executeCleanup(
      client
        .from('issues')
        .delete()
        .eq('owner_id', userId),
      `issues.removeByOwner.${label}`,
    );

    await this.executeCleanup(
      client
        .from('inventory_adjustments')
        .delete()
        .eq('owner_id', userId),
      `inventory_adjustments.removeByOwner.${label}`,
    );

    await this.executeCleanup(
      client
        .from('inventory_items')
        .delete()
        .eq('owner_id', userId),
      `inventory_items.removeByOwner.${label}`,
    );

    if (inventoryItemIds.length > 0) {
      await this.executeCleanup(
        client
          .from('issues')
          .update({ inventory_item_id: null })
          .in('inventory_item_id', inventoryItemIds),
        `issues.detachInventory.${label}`,
      );

      await this.executeCleanup(
        client
          .from('issues')
          .delete()
          .in('inventory_item_id', inventoryItemIds),
        `issues.removeByInventory.${label}`,
      );
    }

    await this.executeCleanup(
      client
        .from('inventory_items')
        .update({ approved_by: null, approved_at: null })
        .eq('approved_by', userId),
      `inventory_items.clearApprover.${label}`,
    );

    await this.executeCleanup(
      client
        .from('dashboards')
        .update({ approved_by: null, approved_at: null })
        .eq('approved_by', userId),
      `dashboards.clearApprover.${label}`,
    );

    await this.executeCleanup(
      client
        .from('sales_order_items')
        .delete()
        .eq('owner_id', userId),
      `sales_order_items.removeByOwner.${label}`,
    );

    await this.executeCleanup(
      client
        .from('sales_orders')
        .delete()
        .eq('owner_id', userId),
      `sales_orders.removeByOwner.${label}`,
    );

    await this.executeCleanup(
      client
        .from('customers')
        .delete()
        .eq('owner_id', userId),
      `customers.removeByOwner.${label}`,
    );

    if (datasetIds.length > 0) {
      await this.executeCleanup(
        client
          .from('inventory_adjustments')
          .delete()
          .in('dataset_id', datasetIds),
        `inventory_adjustments.removeByDataset.${label}`,
      );

      await this.executeCleanup(
        client
          .from('inventory_items')
          .delete()
          .in('dataset_id', datasetIds),
        `inventory_items.removeByDataset.${label}`,
      );
    }

    await this.executeCleanup(
      client
        .from('dashboards')
        .delete()
        .eq('owner_id', userId),
      `dashboards.removeByOwner.${label}`,
    );

    await this.executeCleanup(
      client
        .from('datasets')
        .delete()
        .eq('owner_id', userId),
      `datasets.removeByOwner.${label}`,
    );

    if (options.removeUserRecord) {
      if (options.userEmail) {
        await this.executeCleanup(
          client
            .from('users')
            .delete()
            .eq('email', options.userEmail),
          `data_users.removeByEmail.${label}`,
        );
      } else {
        await this.executeCleanup(
          client
            .from('users')
            .delete()
            .eq('id', userId),
          `data_users.removeById.${label}`,
        );
      }
    }
  }

  private async collectIds(
    operation: PromiseLike<{ data: Array<{ id: string }> | null; error: PostgrestError | null }>,
    context: string,
  ): Promise<string[]> {
    try {
      const { data, error } = await operation;
      if (error && !this.isIgnorableCleanupError(error)) {
        console.warn(`No se pudieron recopilar identificadores (${context}):`, error);
        return [];
      }
      return (data ?? []).map((row) => row.id);
    } catch (error) {
      console.warn(`Fallo inesperado recopilando identificadores (${context}):`, error);
      return [];
    }
  }

  private async executeCleanup(
    operation: PromiseLike<{ error: PostgrestError | null }>,
    context: string,
  ): Promise<void> {
    try {
      const { error } = await operation;
      if (error && !this.isIgnorableCleanupError(error)) {
        console.warn(`No se pudo limpiar completamente (${context}). Requiere revisión manual.`, error);
      }
    } catch (error) {
      console.warn(`Fallo inesperado durante la limpieza (${context}).`, error);
    }
  }

  private isIgnorableCleanupError(error?: PostgrestError | null): boolean {
    if (!error) {
      return true;
    }

    const ignorableCodes = new Set([
      'PGRST116', // no rows
      'PGRST114', // table not found (head)
      'PGRST106',
      'PGRST100',
      '42P01', // table missing
      '42703', // column missing
      '42501', // insufficient privilege (ignore to allow manual cleanup)
    ]);
    return ignorableCodes.has(error.code ?? '');
  }

  private resolveUserDeleteError(error: PostgrestError): string {
    if (error.code === '23503') {
      const tableMatch = /on table "([^"]+)"/i.exec(error.message ?? '');
      const constraintMatch = /constraint "([^"]+)"/i.exec(error.message ?? '');
      const tableHint = tableMatch ? ` en la tabla "${tableMatch[1]}"` : '';
      const constraintHint = constraintMatch ? ` (restricción ${constraintMatch[1]})` : '';
      const detail = error.details ? ` Detalle: ${error.details}` : '';
      return `No se puede eliminar el usuario porque tiene datos asociados${tableHint}${constraintHint}. Elimina o reasigna esas referencias e inténtalo nuevamente.${detail}`.trim();
    }

    if (error.code === '42501') {
      return 'No tienes permisos suficientes para completar la eliminación. Verifica la configuración de Supabase.';
    }

    return 'No se pudo eliminar el usuario porque aún existen referencias activas en la plataforma. Revisa datasets, dashboards, inventario e incidencias relacionados.';
  }

  private toPublicUser(row: UserRow): Omit<UserEntity, 'passwordHash'> {
    const entity = this.toUserEntity(row);
    const { passwordHash, ...rest } = entity;
    return rest;
  }

  private toUserEntity(row: UserRow): UserEntity {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      passwordHash: row.password_hash,
      approved: row.approved,
      organizationId: row.organization_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
