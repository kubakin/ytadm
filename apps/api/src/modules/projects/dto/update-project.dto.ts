import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
