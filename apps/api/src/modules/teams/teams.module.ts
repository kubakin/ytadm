import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '../../database/entities/project.entity';
import { VideoEntity } from '../../database/entities/video.entity';
import { TeamWatchEntity } from '../../database/entities/team-watch.entity';
import { ConfigEntryEntity } from '../../database/entities/config-entry.entity';
import { ThemeEntity } from '../../database/entities/theme.entity';
import { TeamThemeKnowledgeEntity } from '../../database/entities/team-theme-knowledge.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      VideoEntity,
      TeamWatchEntity,
      ConfigEntryEntity,
      ThemeEntity,
      TeamThemeKnowledgeEntity,
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
