import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { TeamsService } from './teams.service';
import { TeamReportDto } from './dto/team-report.dto';
import { RemoveTeamKnowledgeDto } from './dto/remove-team-knowledge.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('team')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post('register')
  register() {
    return this.teamsService.registerTeam();
  }

  @Get('next-video')
  nextVideo(@Req() req: Request, @Query('teamApiKey') teamApiKey?: string) {
    return this.teamsService.getNextVideo(this.extractClientIp(req), teamApiKey);
  }

  @Get('task')
  task(@Req() req: Request, @Query('teamApiKey') teamApiKey?: string) {
    return this.teamsService.getNextVideo(this.extractClientIp(req), teamApiKey);
  }

  @Post('task')
  report(@Req() req: Request, @Body() dto: TeamReportDto) {
    console.log(dto);
    return this.teamsService.reportTaskStatus(
      dto.taskId,
      dto.status,
      this.extractClientIp(req),
    );
  }

  @Get('admin/tasks/current')
  @UseGuards(JwtAuthGuard)
  currentTasks() {
    return this.teamsService.getCurrentTasks();
  }

  @Delete('admin/tasks/current/:taskId')
  @UseGuards(JwtAuthGuard)
  removeCurrentTask(@Param('taskId') taskId: string) {
    return this.teamsService.removeCurrentTask(taskId);
  }

  @Get('admin/teams/knowledge')
  @UseGuards(JwtAuthGuard)
  teamKnowledge() {
    return this.teamsService.getTeamKnowledgeOverview();
  }

  @Delete('admin/teams/knowledge')
  @UseGuards(JwtAuthGuard)
  removeTeamKnowledge(@Body() dto: RemoveTeamKnowledgeDto) {
    return this.teamsService.removeTeamKnowledge(dto.teamIp, dto.themeId);
  }

  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp =
      typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined;
    return forwardedIp || req.ip || req.socket.remoteAddress || 'unknown';
  }
}
