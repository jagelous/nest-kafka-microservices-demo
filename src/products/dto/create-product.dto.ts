import { IsString, IsNumber, MinLength, Min } from 'class-validator';

/**
 * DTO for creating a new product.
 * Validates and shapes incoming request body.
 */
export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;
}
