import { IsString, IsNumber, MinLength, Min, IsOptional } from 'class-validator';

/**
 * DTO for updating a product.
 * All fields optional - only provided fields are updated (partial update).
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
