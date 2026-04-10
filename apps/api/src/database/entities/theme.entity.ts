import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity('themes')
export class ThemeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', array: true, default: '{}' })
  keywords: string[];

  @Column({ default: '', nullable: true })
  vkGroup: string;

  @Column({ default: '', nullable: true })
  landingUrl: string;

  @OneToMany(() => ProjectEntity, (project) => project.theme)
  projects: ProjectEntity[];
}
