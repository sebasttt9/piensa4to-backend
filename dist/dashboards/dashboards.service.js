"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardsService = void 0;
const common_1 = require("@nestjs/common");
const datasets_service_1 = require("../datasets/datasets.service");
const supabase_constants_1 = require("../database/supabase.constants");
const supabase_js_1 = require("@supabase/supabase-js");
const share_dashboard_dto_1 = require("./dto/share-dashboard.dto");
const pdfkit_1 = __importDefault(require("pdfkit"));
let DashboardsService = class DashboardsService {
    supabase;
    datasetsService;
    constructor(supabase, datasetsService) {
        this.supabase = supabase;
        this.datasetsService = datasetsService;
    }
    tableName = 'dashboards';
    shareTableName = 'dashboard_shares';
    datasetsJoinTable = 'dashboard_datasets';
    async create(ownerId, dto, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para crear dashboards');
        }
        if (dto.datasetIds && dto.datasetIds.length > 0) {
            for (const datasetId of dto.datasetIds) {
                await this.datasetsService.findOne(ownerId, datasetId, userRole, organizationId);
            }
        }
        const initialStatus = userRole === 'admin' || userRole === 'superadmin' ? 'approved' : 'pending';
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert({
            owner_id: ownerId,
            organization_id: organizationId,
            name: dto.name,
            description: dto.description ?? null,
            layout: dto.layout ?? {},
            charts: dto.charts ?? [],
            is_public: false,
            status: initialStatus,
            approved_by: initialStatus === 'approved' ? ownerId : null,
            approved_at: initialStatus === 'approved' ? new Date().toISOString() : null,
        })
            .select('*')
            .single();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo crear el dashboard');
        }
        if (!data) {
            throw new common_1.InternalServerErrorException('No se pudo crear el dashboard');
        }
        await this.replaceDashboardDatasets(data.id, dto.datasetIds ?? []);
        const datasets = await this.collectDatasetIds([data.id]);
        return this.toEntity(data, datasets.get(data.id));
    }
    async findAll(ownerId, userRole = 'user', skip = 0, limit = 10, organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para listar dashboards');
        }
        const rangeStart = skip;
        const rangeEnd = skip + limit - 1;
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('organization_id', organizationId)
            .order('updated_at', { ascending: false })
            .range(rangeStart, rangeEnd);
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudieron listar los dashboards');
        }
        const rows = (data ?? []);
        const datasets = await this.collectDatasetIds(rows.map((row) => row.id));
        return rows.map((row) => this.toEntity(row, datasets.get(row.id)));
    }
    async countByUser(ownerId, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para contar dashboards');
        }
        const { count, error } = await this.supabase
            .from(this.tableName)
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId);
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo contar los dashboards');
        }
        return count ?? 0;
    }
    async findOne(ownerId, id, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para obtener dashboards');
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .eq('organization_id', organizationId)
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo obtener el dashboard');
        }
        if (!data) {
            throw new common_1.NotFoundException('Dashboard no encontrado');
        }
        const datasets = await this.collectDatasetIds([data.id]);
        return this.toEntity(data, datasets.get(data.id));
    }
    async update(ownerId, id, dto, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para actualizar dashboards');
        }
        const { datasetIds, ...rest } = dto;
        if (datasetIds && datasetIds.length > 0) {
            for (const datasetId of datasetIds) {
                await this.datasetsService.findOne(ownerId, datasetId, userRole, organizationId);
            }
        }
        const updatePayload = { ...rest };
        if (dto.layout !== undefined) {
            updatePayload.layout = dto.layout ?? {};
        }
        if (dto.charts !== undefined) {
            updatePayload.charts = dto.charts ?? [];
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updatePayload)
            .eq('id', id)
            .eq('organization_id', organizationId)
            .select('*')
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo actualizar el dashboard');
        }
        if (!data) {
            throw new common_1.NotFoundException('Dashboard no encontrado');
        }
        await this.replaceDashboardDatasets(id, datasetIds ?? []);
        const datasets = await this.collectDatasetIds([id]);
        return this.toEntity(data, datasets.get(id));
    }
    async share(ownerId, id, isPublic, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para compartir dashboards');
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({ is_public: isPublic })
            .eq('id', id)
            .eq('organization_id', organizationId)
            .select('*')
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo compartir el dashboard');
        }
        if (!data) {
            throw new common_1.NotFoundException('Dashboard no encontrado');
        }
        const datasets = await this.collectDatasetIds([data.id]);
        return this.toEntity(data, datasets.get(data.id));
    }
    async remove(ownerId, id, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para eliminar dashboards');
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('id', id)
            .eq('organization_id', organizationId)
            .select('id')
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo eliminar el dashboard');
        }
        if (!data) {
            throw new common_1.NotFoundException('Dashboard no encontrado');
        }
    }
    async shareWithContact(ownerId, id, dto, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para compartir dashboards');
        }
        const dashboard = await this.findOne(ownerId, id, userRole, organizationId);
        const contact = dto.contact.trim();
        if (dto.channel === share_dashboard_dto_1.ShareChannel.EMAIL) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contact)) {
                throw new common_1.BadRequestException('El correo electrónico no es válido');
            }
        }
        if (dto.channel === share_dashboard_dto_1.ShareChannel.SMS) {
            const phoneRegex = /^[+]?\d[\d\s-]{7,15}$/;
            if (!phoneRegex.test(contact)) {
                throw new common_1.BadRequestException('El número de teléfono no es válido');
            }
        }
        const { data, error } = await this.supabase
            .from(this.shareTableName)
            .insert({
            dashboard_id: dashboard.id,
            owner_id: ownerId,
            channel: dto.channel,
            contact,
            message: dto.message ?? null,
            status: 'pending',
        })
            .select('*')
            .single();
        if (error || !data) {
            throw new common_1.InternalServerErrorException('No se pudo registrar la invitación de compartido');
        }
        if (dto.makePublic === true && !dashboard.isPublic) {
            await this.share(ownerId, id, true, userRole, organizationId);
        }
        return this.toShareEntity(data);
    }
    async export(ownerId, id, format, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para exportar dashboards');
        }
        const dashboard = await this.findOne(ownerId, id, userRole, organizationId);
        if (format === 'json') {
            return dashboard;
        }
        const doc = new pdfkit_1.default({ margin: 48, size: 'A4' });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        const completion = new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (error) => reject(error));
        });
        doc.fontSize(20).text(dashboard.name, { underline: false });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#4b5563').text(`Última actualización: ${new Date(dashboard.updatedAt).toLocaleString('es-ES')}`);
        doc.moveDown(1);
        if (dashboard.description) {
            doc.fontSize(12).fillColor('#0f172a').text(dashboard.description, {
                align: 'left',
            });
            doc.moveDown(1);
        }
        doc.fillColor('#1f2937').fontSize(14).text('Datasets asociados', { underline: true });
        doc.moveDown(0.5);
        if (dashboard.datasetIds.length === 0) {
            doc.fontSize(12).fillColor('#475569').text('Sin datasets vinculados.');
        }
        else {
            dashboard.datasetIds.forEach((datasetId, index) => {
                doc.fontSize(12).fillColor('#1f2937').text(`${index + 1}. ${datasetId}`);
            });
        }
        doc.moveDown(1);
        doc.fillColor('#1f2937').fontSize(14).text('Visualizaciones', { underline: true });
        doc.moveDown(0.5);
        if (dashboard.charts.length === 0) {
            doc.fontSize(12).fillColor('#475569').text('Sin visualizaciones registradas.');
        }
        else {
            dashboard.charts.forEach((chart, index) => {
                doc.fontSize(12).fillColor('#1f2937').text(`${index + 1}. ${chart.type}`);
                doc.fontSize(10).fillColor('#475569').text(JSON.stringify(chart.config ?? {}, null, 2), {
                    align: 'left',
                });
                doc.moveDown(0.5);
            });
        }
        doc.end();
        return completion;
    }
    toEntity(row, datasetIds) {
        return {
            id: row.id,
            ownerId: row.owner_id,
            name: row.name,
            description: row.description ?? undefined,
            datasetIds: datasetIds ?? row.dataset_ids ?? [],
            layout: row.layout ?? {},
            charts: row.charts ?? [],
            isPublic: row.is_public,
            status: row.status,
            approvedBy: row.approved_by ?? undefined,
            approvedAt: row.approved_at ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    toShareEntity(row) {
        return {
            id: row.id,
            dashboardId: row.dashboard_id,
            ownerId: row.owner_id,
            channel: row.channel,
            contact: row.contact,
            message: row.message ?? undefined,
            status: row.status,
            createdAt: row.created_at,
        };
    }
    async replaceDashboardDatasets(dashboardId, datasetIds) {
        const { error: deleteError } = await this.supabase
            .from(this.datasetsJoinTable)
            .delete()
            .eq('dashboard_id', dashboardId);
        if (deleteError) {
            throw new common_1.InternalServerErrorException('No se pudieron actualizar los datasets del dashboard');
        }
        if (!datasetIds || datasetIds.length === 0) {
            return;
        }
        const records = datasetIds.map((datasetId) => ({
            dashboard_id: dashboardId,
            dataset_id: datasetId,
        }));
        const { error: insertError } = await this.supabase
            .from(this.datasetsJoinTable)
            .insert(records);
        if (insertError) {
            throw new common_1.InternalServerErrorException('No se pudieron vincular los datasets al dashboard');
        }
    }
    async collectDatasetIds(dashboardIds) {
        const result = new Map();
        if (!dashboardIds || dashboardIds.length === 0) {
            return result;
        }
        const { data, error } = await this.supabase
            .from(this.datasetsJoinTable)
            .select('dashboard_id, dataset_id')
            .in('dashboard_id', dashboardIds);
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudieron obtener los datasets asociados al dashboard');
        }
        data?.forEach((row) => {
            if (!result.has(row.dashboard_id)) {
                result.set(row.dashboard_id, []);
            }
            result.get(row.dashboard_id).push(row.dataset_id);
        });
        dashboardIds.forEach((dashboardId) => {
            if (!result.has(dashboardId)) {
                result.set(dashboardId, []);
            }
        });
        return result;
    }
    async approveDashboard(ownerId, dashboardId, status, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para aprobar dashboards');
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({
            status,
            approved_by: ownerId,
            approved_at: new Date().toISOString(),
        })
            .eq('id', dashboardId)
            .eq('organization_id', organizationId)
            .select('*')
            .single();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo actualizar el status del dashboard');
        }
        if (!data) {
            throw new common_1.NotFoundException('Dashboard no encontrado');
        }
        const datasets = await this.collectDatasetIds([dashboardId]);
        return this.toEntity(data, datasets.get(dashboardId));
    }
};
exports.DashboardsService = DashboardsService;
exports.DashboardsService = DashboardsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __metadata("design:paramtypes", [supabase_js_1.SupabaseClient,
        datasets_service_1.DatasetsService])
], DashboardsService);
//# sourceMappingURL=dashboards.service.js.map