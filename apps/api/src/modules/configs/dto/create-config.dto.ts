import { IsString, MaxLength } from 'class-validator';

export class CreateConfigDto {
  @IsString()
  @MaxLength(150)
  key: string;

  @IsString()
  value: string;

  @IsString()
  @MaxLength(500)
  description: string;
}
