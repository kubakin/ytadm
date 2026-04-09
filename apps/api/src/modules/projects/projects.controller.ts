import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('admin/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(dto);
  }

  @Get()
  list() {
    return this.projectsService.listProjects();
  }

  @Patch(':projectId')
  update(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(projectId, dto);
  }

  @Delete(':projectId')
  remove(@Param('projectId') projectId: string) {
    return this.projectsService.deleteProject(projectId);
  }

  @Get(':projectId/video-stats')
  videoStats(@Param('projectId') projectId: string) {
    return this.projectsService.getProjectVideoStats(projectId);
  }
}
