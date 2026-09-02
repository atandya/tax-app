import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateSptDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  taxYear!: number;

  @IsOptional()
  @IsString()
  formType?: string;
}

export class UpdateSptDto {
  @IsObject()
  data!: Record<string, unknown>;
}

export class RejectSptDto {
  @IsString()
  reason!: string;
}
