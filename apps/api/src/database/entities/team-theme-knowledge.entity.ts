import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('team_theme_knowledge')
@Index(['teamIp', 'themeId'], { unique: true })
export class TeamThemeKnowledgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamIp: string;

  @Column()
  themeId: string;
}
