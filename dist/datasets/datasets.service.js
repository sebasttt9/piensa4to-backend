"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.DatasetsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const papaparse_1 = __importDefault(require("papaparse"));
const XLSX = __importStar(require("xlsx"));
const analysis_service_1 = require("./analysis.service");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_constants_1 = require("../database/supabase.constants");
let DatasetsService = class DatasetsService {
    supabase;
    analysisService;
    configService;
    maxRowsForPreview = 1000;
    dataCache = new Map();
    tableName = 'datasets';
    constructor(supabase, analysisService, configService) {
        this.supabase = supabase;
        this.analysisService = analysisService;
        this.configService = configService;
    }
    async create(ownerId, dto, organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para crear datasets');
        }
        if (!dto.name) {
            throw new common_1.BadRequestException('El nombre del dataset es obligatorio');
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert({
            owner_id: ownerId,
            organization_id: organizationId,
            name: dto.name,
            description: dto.description ?? null,
            status: 'pending',
            tags: dto.tags ?? [],
            preview: [],
        })
            .select('*')
            .single();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo crear el dataset');
        }
        return this.toEntity(data);
    }
    async createManual(ownerId, dto, organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para crear datasets manuales');
        }
        this.validateManualData(dto.columns, dto.data);
        const previewLimit = this.configService.get('uploads.previewLimit', 50) ?? 50;
        const preview = dto.data.slice(0, previewLimit);
        this.dataCache.set(`manual_${Date.now()}`, dto.data);
        const analysis = await this.analysisService.analyzeDataset(dto.data, dto.columns);
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert({
            owner_id: ownerId,
            organization_id: organizationId,
            name: dto.name,
            description: dto.description ?? null,
            status: 'processed',
            tags: dto.tags ?? [],
            preview,
            row_count: dto.data.length,
            column_count: dto.columns.length,
            analysis,
            file_type: 'manual',
            filename: null,
            file_size: null,
        })
            .select('*')
            .single();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo crear el dataset manual');
        }
        return this.toEntity(data);
    }
    async uploadDataset(ownerId, datasetId, file, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para subir archivos a datasets');
        }
        if (!file) {
            throw new common_1.BadRequestException('Debe adjuntar un archivo CSV o Excel.');
        }
        await this.findOne(ownerId, datasetId, userRole, organizationId);
        const extension = this.resolveExtension(file.originalname);
        const rows = await this.parseFile(file, extension);
        if (rows.length === 0) {
            throw new common_1.BadRequestException('El archivo no contiene registros.');
        }
        const previewLimit = this.configService.get('uploads.previewLimit', 50) ?? 50;
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        this.dataCache.set(datasetId, rows);
        const analysis = await this.analysisService.analyzeDataset(rows);
        const preview = rows.slice(0, previewLimit);
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({
            filename: file.originalname,
            file_size: file.size,
            file_type: extension,
            row_count: rows.length,
            column_count: columns.length,
            preview,
            analysis,
            status: 'processed',
        })
            .eq('id', datasetId)
            .eq('organization_id', organizationId)
            .select('*')
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo actualizar el dataset');
        }
        if (!data) {
            throw new common_1.NotFoundException('Dataset no encontrado');
        }
        return this.toEntity(data);
    }
    async update(ownerId, datasetId, dto, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para actualizar datasets');
        }
        await this.findOne(ownerId, datasetId, userRole, organizationId);
        const payload = {};
        if (dto.name !== undefined) {
            payload.name = dto.name;
        }
        if (dto.description !== undefined) {
            payload.description = dto.description;
        }
        if (dto.tags !== undefined) {
            payload.tags = dto.tags;
        }
        if (Object.keys(payload).length === 0) {
            return this.findOne(ownerId, datasetId, userRole, organizationId);
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(payload)
            .eq('id', datasetId)
            .eq('organization_id', organizationId)
            .select('*')
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo actualizar el dataset');
        }
        if (!data) {
            throw new common_1.NotFoundException('Dataset no encontrado');
        }
        return this.toEntity(data);
    }
    async findAll(ownerId, userRole = 'user', skip = 0, limit = 10, organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para listar datasets');
        }
        const rangeStart = skip;
        const rangeEnd = skip + limit - 1;
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .range(rangeStart, rangeEnd);
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudieron listar los datasets');
        }
        return (data ?? []).map((row) => this.toEntity(row));
    }
    async countByUser(ownerId, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para contar datasets');
        }
        const { count, error } = await this.supabase
            .from(this.tableName)
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId);
        if (error) {
            console.error('Error counting datasets:', error);
            throw new common_1.InternalServerErrorException('No se pudo contar los datasets');
        }
        return count ?? 0;
    }
    async findOne(ownerId, datasetId, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para obtener datasets');
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', datasetId)
            .eq('organization_id', organizationId)
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo obtener el dataset');
        }
        if (!data) {
            throw new common_1.NotFoundException('Dataset no encontrado');
        }
        return this.toEntity(data);
    }
    async getPreview(datasetId, limit = 50) {
        const cached = this.dataCache.get(datasetId);
        if (cached) {
            return cached.slice(0, limit);
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('preview')
            .eq('id', datasetId)
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo obtener la vista previa');
        }
        const preview = data?.preview ?? [];
        return preview.slice(0, limit);
    }
    async remove(ownerId, datasetId, userRole = 'user', organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para eliminar datasets');
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('id', datasetId)
            .eq('organization_id', organizationId)
            .select('id')
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo eliminar el dataset');
        }
        if (!data) {
            throw new common_1.NotFoundException('Dataset no encontrado');
        }
        this.dataCache.delete(datasetId);
    }
    resolveExtension(fileName) {
        const lower = fileName.toLowerCase();
        if (lower.endsWith('.csv')) {
            return 'csv';
        }
        if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
            return 'xlsx';
        }
        if (lower.endsWith('.json')) {
            return 'json';
        }
        throw new common_1.BadRequestException('Formato no soportado. Use CSV, Excel (.xlsx/.xls) o JSON.');
    }
    async parseFile(file, extension) {
        if (extension === 'csv') {
            const content = file.buffer.toString('utf-8');
            const parsed = papaparse_1.default.parse(content, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
            });
            if (parsed.errors.length > 0) {
                throw new common_1.BadRequestException(`Error al procesar CSV: ${parsed.errors[0].message}`);
            }
            return parsed.data;
        }
        if (extension === 'json') {
            try {
                const content = file.buffer.toString('utf-8');
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    return parsed.map(item => {
                        if (typeof item === 'object' && item !== null) {
                            return item;
                        }
                        throw new common_1.BadRequestException('El JSON debe contener un array de objetos.');
                    });
                }
                if (typeof parsed === 'object' && parsed !== null) {
                    const possibleDataKeys = ['data', 'records', 'rows', 'items', 'results'];
                    for (const key of possibleDataKeys) {
                        if (Array.isArray(parsed[key])) {
                            return parsed[key].map(item => {
                                if (typeof item === 'object' && item !== null) {
                                    return item;
                                }
                                return { [key]: item };
                            });
                        }
                    }
                    return [parsed];
                }
                throw new common_1.BadRequestException('Formato JSON no válido. Debe ser un array de objetos o un objeto con una propiedad que contenga los datos.');
            }
            catch (error) {
                if (error instanceof SyntaxError) {
                    throw new common_1.BadRequestException('El archivo JSON tiene un formato inválido.');
                }
                throw error;
            }
        }
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return [];
        }
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, {
            raw: true,
        });
        return data;
    }
    validateManualData(columns, data) {
        if (columns.length === 0) {
            throw new common_1.BadRequestException('Debe definir al menos una columna');
        }
        if (data.length === 0) {
            throw new common_1.BadRequestException('Debe proporcionar al menos una fila de datos');
        }
        const columnNames = columns.map(col => col.name);
        if (new Set(columnNames).size !== columnNames.length) {
            throw new common_1.BadRequestException('Los nombres de las columnas deben ser únicos');
        }
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            for (const column of columns) {
                if (!(column.name in row)) {
                    throw new common_1.BadRequestException(`Fila ${i + 1}: Falta la columna '${column.name}'`);
                }
                const value = row[column.name];
                this.validateColumnType(column, value, i + 1);
            }
            const rowKeys = Object.keys(row);
            const extraColumns = rowKeys.filter(key => !columnNames.includes(key));
            if (extraColumns.length > 0) {
                throw new common_1.BadRequestException(`Fila ${i + 1}: Columnas no definidas encontradas: ${extraColumns.join(', ')}`);
            }
        }
    }
    validateColumnType(column, value, rowNumber) {
        const errorPrefix = `Fila ${rowNumber}, columna '${column.name}':`;
        if (value === null || value === undefined || value === '') {
            return;
        }
        switch (column.type) {
            case 'string':
                if (typeof value !== 'string') {
                    throw new common_1.BadRequestException(`${errorPrefix} Se esperaba un texto, pero se recibió ${typeof value}`);
                }
                break;
            case 'number':
                if (typeof value !== 'number' && isNaN(Number(value))) {
                    throw new common_1.BadRequestException(`${errorPrefix} Se esperaba un número, pero se recibió ${typeof value}`);
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean' && !['true', 'false', '1', '0'].includes(String(value).toLowerCase())) {
                    throw new common_1.BadRequestException(`${errorPrefix} Se esperaba un valor booleano (true/false), pero se recibió ${typeof value}`);
                }
                break;
            case 'date':
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    throw new common_1.BadRequestException(`${errorPrefix} Se esperaba una fecha válida, pero se recibió ${value}`);
                }
                break;
            default:
                throw new common_1.BadRequestException(`${errorPrefix} Tipo de columna no válido: ${column.type}`);
        }
    }
    toEntity(row) {
        return {
            id: row.id,
            ownerId: row.owner_id,
            name: row.name,
            description: row.description ?? undefined,
            filename: row.filename ?? undefined,
            fileSize: row.file_size ?? undefined,
            fileType: row.file_type ?? undefined,
            rowCount: row.row_count ?? undefined,
            columnCount: row.column_count ?? undefined,
            analysis: row.analysis ?? undefined,
            preview: row.preview ?? [],
            status: row.status,
            tags: row.tags ?? [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
};
exports.DatasetsService = DatasetsService;
exports.DatasetsService = DatasetsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __metadata("design:paramtypes", [supabase_js_1.SupabaseClient,
        analysis_service_1.AnalysisService,
        config_1.ConfigService])
], DatasetsService);
//# sourceMappingURL=datasets.service.js.map