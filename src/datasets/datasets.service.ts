import { Inject, Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadDatasetDto } from './dto/upload-dataset.dto';
import { CreateManualDatasetDto, ManualColumnDto } from './dto/create-manual-dataset.dto';
import { AnalysisService } from './analysis.service';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { SUPABASE_DATA_CLIENT } from '../database/supabase.constants';
import { DatasetAnalysis } from './interfaces/dataset-analysis.interface';
import { DatasetEntity } from './entities/dataset.entity';

interface DatasetRow {
  id: string;
  owner_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  filename: string | null;
  file_size: number | null;
  file_type: 'csv' | 'xlsx' | null;
  row_count: number | null;
  column_count: number | null;
  analysis: DatasetAnalysis | null;
  preview: Record<string, unknown>[] | null;
  status: 'pending' | 'processed' | 'error';
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class DatasetsService {
  private readonly maxRowsForPreview = 1000;
  private dataCache = new Map<string, Record<string, unknown>[]>();
  private readonly tableName = 'datasets';

  constructor(
    @Inject(SUPABASE_DATA_CLIENT)
    private readonly supabase: SupabaseClient,
    private readonly analysisService: AnalysisService,
    private readonly configService: ConfigService,
  ) { }



  async create(
    ownerId: string,
    dto: UploadDatasetDto,
    organizationId: string,
  ): Promise<DatasetEntity> {
    if (!organizationId) {
      throw new BadRequestException('La organización es requerida para crear datasets');
    }

    if (!dto.name) {
      throw new BadRequestException('El nombre del dataset es obligatorio');
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
      throw new InternalServerErrorException('No se pudo crear el dataset');
    }

    return this.toEntity(data);
  }

  async createManual(
    ownerId: string,
    dto: CreateManualDatasetDto,
    organizationId: string,
  ): Promise<DatasetEntity> {
    if (!organizationId) {
      throw new BadRequestException('La organización es requerida para crear datasets manuales');
    }
    // Validar que los datos coincidan con las columnas definidas
    this.validateManualData(dto.columns, dto.data);

    const previewLimit = this.configService.get<number>('uploads.previewLimit', 50) ?? 50;
    const preview = dto.data.slice(0, previewLimit);

    // Cache the full data for analysis
    this.dataCache.set(`manual_${Date.now()}`, dto.data);

    // Crear análisis automático
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
      throw new InternalServerErrorException('No se pudo crear el dataset manual');
    }

    return this.toEntity(data);
  }

  async uploadDataset(
    ownerId: string,
    datasetId: string,
    file: Express.Multer.File,
    userRole: string = 'user',
    organizationId: string,
  ): Promise<DatasetEntity> {
    if (!organizationId) {
      throw new BadRequestException('La organización es requerida para subir archivos a datasets');
    }

    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo CSV o Excel.');
    }

    await this.findOne(ownerId, datasetId, userRole, organizationId);
    const extension = this.resolveExtension(file.originalname);
    const rows = await this.parseFile(file, extension);

    if (rows.length === 0) {
      throw new BadRequestException('El archivo no contiene registros.');
    }

    const previewLimit = this.configService.get<number>('uploads.previewLimit', 50) ?? 50;
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    // Cache the full data for analysis
    this.dataCache.set(datasetId, rows);

    // Perform analysis
    const analysis = await this.analysisService.analyzeDataset(rows);

    // Update dataset
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
      throw new InternalServerErrorException('No se pudo actualizar el dataset');
    }

    if (!data) {
      throw new NotFoundException('Dataset no encontrado');
    }

    return this.toEntity(data);
  }

  async update(
    ownerId: string,
    datasetId: string,
    dto: Partial<UploadDatasetDto>,
    userRole: string = 'user',
    organizationId: string,
  ): Promise<DatasetEntity> {
    if (!organizationId) {
      throw new BadRequestException('La organización es requerida para actualizar datasets');
    }

    await this.findOne(ownerId, datasetId, userRole, organizationId);

    const payload: Record<string, unknown> = {};
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

    // All users in the organization can update datasets from that organization
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(payload)
      .eq('id', datasetId)
      .eq('organization_id', organizationId)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('No se pudo actualizar el dataset');
    }

    if (!data) {
      throw new NotFoundException('Dataset no encontrado');
    }

    return this.toEntity(data);
  }

  async findAll(
    ownerId: string,
    userRole: string = 'user',
    skip = 0,
    limit = 10,
    organizationId: string,
  ): Promise<DatasetEntity[]> {
    if (!organizationId) {
      throw new BadRequestException('La organización es requerida para listar datasets');
    }

    const rangeStart = skip;
    const rangeEnd = skip + limit - 1;

    // All users in the organization can access datasets from that organization
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    if (error) {
      throw new InternalServerErrorException('No se pudieron listar los datasets');
    }

    return (data ?? []).map((row) => this.toEntity(row));
  }

  async countByUser(ownerId: string, userRole: string = 'user', organizationId: string): Promise<number> {
    if (!organizationId) {
      throw new BadRequestException('La organización es requerida para contar datasets');
    }

    // Count all datasets from the organization
    const { count, error } = await this.supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error counting datasets:', error);
      throw new InternalServerErrorException('No se pudo contar los datasets');
    }

    return count ?? 0;
  }

  async findOne(ownerId: string, datasetId: string, userRole: string = 'user', organizationId: string): Promise<DatasetEntity> {
    if (!organizationId) {
      throw new BadRequestException('La organización es requerida para obtener datasets');
    }

    // All users in the organization can access datasets from that organization
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', datasetId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('No se pudo obtener el dataset');
    }

    if (!data) {
      throw new NotFoundException('Dataset no encontrado');
    }

    return this.toEntity(data);
  }

  async getPreview(
    datasetId: string,
    limit = 50,
  ): Promise<Record<string, unknown>[]> {
    // Return cached preview or from database
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
      throw new InternalServerErrorException('No se pudo obtener la vista previa');
    }

    const preview = data?.preview ?? [];
    return preview.slice(0, limit);
  }

  async remove(ownerId: string, datasetId: string, userRole: string = 'user', organizationId: string): Promise<void> {
    if (!organizationId) {
      throw new BadRequestException('La organización es requerida para eliminar datasets');
    }

    // All users in the organization can remove datasets from that organization
    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', datasetId)
      .eq('organization_id', organizationId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('No se pudo eliminar el dataset');
    }

    if (!data) {
      throw new NotFoundException('Dataset no encontrado');
    }

    // Clear cache
    this.dataCache.delete(datasetId);
  }

  private resolveExtension(fileName: string): 'csv' | 'xlsx' | 'json' {
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
    throw new BadRequestException('Formato no soportado. Use CSV, Excel (.xlsx/.xls) o JSON.');
  }

  private async parseFile(
    file: Express.Multer.File,
    extension: 'csv' | 'xlsx' | 'json',
  ): Promise<Record<string, unknown>[]> {
    if (extension === 'csv') {
      const content = file.buffer.toString('utf-8');
      const parsed = Papa.parse<Record<string, unknown>>(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      if (parsed.errors.length > 0) {
        throw new BadRequestException(
          `Error al procesar CSV: ${parsed.errors[0].message}`,
        );
      }

      return parsed.data;
    }

    if (extension === 'json') {
      try {
        const content = file.buffer.toString('utf-8');
        const parsed = JSON.parse(content);

        // Si es un array de objetos, procesarlo directamente
        if (Array.isArray(parsed)) {
          return parsed.map(item => {
            if (typeof item === 'object' && item !== null) {
              return item as Record<string, unknown>;
            }
            throw new BadRequestException('El JSON debe contener un array de objetos.');
          });
        }

        // Si es un objeto con una propiedad que contiene el array de datos
        if (typeof parsed === 'object' && parsed !== null) {
          // Buscar propiedades comunes que podrían contener los datos
          const possibleDataKeys = ['data', 'records', 'rows', 'items', 'results'];
          for (const key of possibleDataKeys) {
            if (Array.isArray(parsed[key])) {
              return parsed[key].map(item => {
                if (typeof item === 'object' && item !== null) {
                  return item as Record<string, unknown>;
                }
                return { [key]: item };
              });
            }
          }

          // Si no encontramos arrays, asumir que el objeto raíz es un array de un elemento
          return [parsed as Record<string, unknown>];
        }

        throw new BadRequestException('Formato JSON no válido. Debe ser un array de objetos o un objeto con una propiedad que contenga los datos.');
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new BadRequestException('El archivo JSON tiene un formato inválido.');
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
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: true,
    });

    return data;
  }

  private validateManualData(columns: ManualColumnDto[], data: Record<string, any>[]): void {
    if (columns.length === 0) {
      throw new BadRequestException('Debe definir al menos una columna');
    }

    if (data.length === 0) {
      throw new BadRequestException('Debe proporcionar al menos una fila de datos');
    }

    // Verificar nombres de columnas únicos
    const columnNames = columns.map(col => col.name);
    if (new Set(columnNames).size !== columnNames.length) {
      throw new BadRequestException('Los nombres de las columnas deben ser únicos');
    }

    // Validar cada fila de datos
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Verificar que todas las columnas definidas estén presentes
      for (const column of columns) {
        if (!(column.name in row)) {
          throw new BadRequestException(`Fila ${i + 1}: Falta la columna '${column.name}'`);
        }

        // Validar tipo de dato
        const value = row[column.name];
        this.validateColumnType(column, value, i + 1);
      }

      // Verificar que no haya columnas extra
      const rowKeys = Object.keys(row);
      const extraColumns = rowKeys.filter(key => !columnNames.includes(key));
      if (extraColumns.length > 0) {
        throw new BadRequestException(`Fila ${i + 1}: Columnas no definidas encontradas: ${extraColumns.join(', ')}`);
      }
    }
  }

  private validateColumnType(column: ManualColumnDto, value: any, rowNumber: number): void {
    const errorPrefix = `Fila ${rowNumber}, columna '${column.name}':`;

    if (value === null || value === undefined || value === '') {
      // Permitir valores nulos/undefined/vacíos para cualquier tipo
      return;
    }

    switch (column.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new BadRequestException(`${errorPrefix} Se esperaba un texto, pero se recibió ${typeof value}`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          throw new BadRequestException(`${errorPrefix} Se esperaba un número, pero se recibió ${typeof value}`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && !['true', 'false', '1', '0'].includes(String(value).toLowerCase())) {
          throw new BadRequestException(`${errorPrefix} Se esperaba un valor booleano (true/false), pero se recibió ${typeof value}`);
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new BadRequestException(`${errorPrefix} Se esperaba una fecha válida, pero se recibió ${value}`);
        }
        break;

      default:
        throw new BadRequestException(`${errorPrefix} Tipo de columna no válido: ${column.type}`);
    }
  }

  private toEntity(row: DatasetRow): DatasetEntity {
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
}
