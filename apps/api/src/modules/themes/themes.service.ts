import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeEntity } from '../../database/entities/theme.entity';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';

@Injectable()
export class ThemesService {
  constructor(
    @InjectRepository(ThemeEntity)
    private readonly themesRepo: Repository<ThemeEntity>,
  ) {}

  listThemes() {
    return this.themesRepo.find({ order: { name: 'ASC' } });
  }

  async createTheme(dto: CreateThemeDto) {
    const name = dto.name.trim();
    const exists = await this.themesRepo.findOne({ where: { name } });
    if (exists) {
      throw new ConflictException('Theme already exists');
    }
    return this.themesRepo.save({
      name,
      keywords: this.normalizeKeywords(dto.keywords),
      vkGroup: dto.vkGroup?.trim() || '',
      landingUrl: dto.landingUrl?.trim() || '',
    });
  }

  async updateTheme(themeId: string, patch: UpdateThemeDto) {
    const theme = await this.themesRepo.findOne({ where: { id: themeId } });
    if (!theme) {
      throw new NotFoundException('Theme not found');
    }
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      const duplicate = await this.themesRepo.findOne({ where: { name } });
      if (duplicate && duplicate.id !== theme.id) {
        throw new ConflictException('Theme already exists');
      }
      theme.name = name;
    }
    if (patch.keywords !== undefined) {
      theme.keywords = this.normalizeKeywords(patch.keywords);
    }
    if (patch.vkGroup !== undefined) {
      theme.vkGroup = patch.vkGroup.trim();
    }
    if (patch.landingUrl !== undefined) {
      theme.landingUrl = patch.landingUrl.trim();
    }
    return this.themesRepo.save(theme);
  }

  async deleteTheme(themeId: string) {
    const theme = await this.themesRepo.findOne({ where: { id: themeId } });
    if (!theme) {
      throw new NotFoundException('Theme not found');
    }
    await this.themesRepo.remove(theme);
    return { deleted: true, id: themeId };
  }

  private normalizeKeywords(input?: string[]) {
    return (input ?? []).map((keyword) => keyword.trim()).filter(Boolean);
  }
}
