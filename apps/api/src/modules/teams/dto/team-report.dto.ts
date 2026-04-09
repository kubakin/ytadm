import { IsIn, IsString } from 'class-validator';

export class TeamReportDto {
  // @IsString()
  taskId: string;

  // @IsString()
  // @IsIn(['prepare', 'process', 'completed'])
  status: string;
}
