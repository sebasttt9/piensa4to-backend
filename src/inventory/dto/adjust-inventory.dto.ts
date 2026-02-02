import { IsInt } from 'class-validator';

export class AdjustInventoryDto {
    @IsInt()
    amount!: number;
}
