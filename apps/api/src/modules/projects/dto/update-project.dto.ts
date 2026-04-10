import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  youtubeChannel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetViews?: number;

  @IsOptional()
  @IsUUID()
  themeId?: string;

  @IsOptional()
  @IsString()
  youtubeChannelName?: string;

  @IsOptional()
  @IsString()
  youtubeChannelDescription?: string;

  @IsOptional()
  @IsString()
  videoPrefix?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
