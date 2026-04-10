import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ThemesService } from './themes.service';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';

@Controller('admin/themes')
@UseGuards(JwtAuthGuard)
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  list() {
    return this.themesService.listThemes();
  }

  @Post()
  create(@Body() dto: CreateThemeDto) {
    return this.themesService.createTheme(dto);
  }

  @Patch(':themeId')
  update(@Param('themeId') themeId: string, @Body() dto: UpdateThemeDto) {
    return this.themesService.updateTheme(themeId, dto);
  }

  @Delete(':themeId')
  remove(@Param('themeId') themeId: string) {
    return this.themesService.deleteTheme(themeId);
  }
}
