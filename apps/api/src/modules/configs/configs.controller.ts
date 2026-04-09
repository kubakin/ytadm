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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigsService } from './configs.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Controller('admin/configs')
@UseGuards(JwtAuthGuard)
export class ConfigsController {
  constructor(private readonly configsService: ConfigsService) {}

  @Get()
  list() {
    return this.configsService.list();
  }

  @Post()
  create(@Body() dto: CreateConfigDto) {
    return this.configsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConfigDto) {
    return this.configsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.configsService.remove(id);
  }
}
