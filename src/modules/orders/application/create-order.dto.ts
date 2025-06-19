import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  orderId!: string;

  @IsArray()
  @ArrayNotEmpty()
  items!: any[];
}
