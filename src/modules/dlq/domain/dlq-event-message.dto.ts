import { IsString, IsObject, IsOptional, IsNumber } from 'class-validator';

export class DlqEventMessageDto {
    @IsString()
    id!: string;

    @IsString()
    eventName!: string;

    @IsObject()
    payload!: Record<string, any>;

    @IsOptional()
    @IsNumber()
    timestamp?: number;
}
