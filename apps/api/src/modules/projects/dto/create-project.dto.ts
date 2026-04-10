import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  shortDescription: string;

  @IsString()
  youtubeChannel: string;

  @IsInt()
  @Min(1)
  targetViews: number;

  @IsUUID()
  themeId: string;

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
