import { IsInt, IsString, Min } from 'class-validator';

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
}
