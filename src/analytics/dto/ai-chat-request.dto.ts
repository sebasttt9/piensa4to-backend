import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AiChatRequestDto {
    @IsString()
    @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
    @MaxLength(600, { message: 'El mensaje no puede superar los 600 caracteres' })
    message!: string;

    @IsOptional()
    @IsString()
    @IsUUID('4', { message: 'El dataset debe ser un UUID válido' })
    datasetId?: string;
}
