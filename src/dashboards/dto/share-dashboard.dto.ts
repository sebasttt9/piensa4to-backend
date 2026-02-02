import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ShareChannel {
    EMAIL = 'email',
    SMS = 'sms',
}

export class ShareDashboardDto {
    @IsEnum(ShareChannel, { message: 'El canal debe ser email o sms' })
    channel: ShareChannel;

    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    contact: string;

    @IsString()
    @IsOptional()
    @MaxLength(240)
    message?: string;

    @IsOptional()
    @IsBoolean()
    makePublic?: boolean;
}
