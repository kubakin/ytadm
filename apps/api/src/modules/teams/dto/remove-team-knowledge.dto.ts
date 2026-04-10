import { IsString, IsUUID } from 'class-validator';

export class RemoveTeamKnowledgeDto {
  @IsString()
  teamIp: string;

  @IsUUID()
  themeId: string;
}
