import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { MediaService } from './media.service';

class PresignDto {
  filename!: string;
  mime!: string;
}

class CompleteDto {
  storageKey!: string;
  altPt?: string;
}

@Controller('api/admin/media')
@UseGuards(AdminGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('presign')
  presign(@Body() dto: PresignDto) {
    return this.media.presign(dto.filename, dto.mime);
  }

  @Post('complete')
  complete(@Body() dto: CompleteDto) {
    return this.media.complete(dto.storageKey, dto.altPt);
  }
}
