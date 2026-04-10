import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeEntity } from '../../database/entities/theme.entity';
import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';

@Module({
  imports: [TypeOrmModule.forFeature([ThemeEntity])],
  controllers: [ThemesController],
  providers: [ThemesService],
})
export class ThemesModule {}
