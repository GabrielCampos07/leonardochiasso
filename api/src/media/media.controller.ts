import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { AdminGuard } from '../admin/admin.guard';
import { MediaService } from './media.service';

class PresignDto {
  @IsString()
  @MinLength(1)
  filename!: string;

  @IsString()
  @MinLength(1)
  mime!: string;
}

class CompleteDto {
  @IsString()
  @MinLength(1)
  storageKey!: string;

  @IsOptional()
  @IsString()
  altPt?: string;

  /** Dev / local: original image as base64 when S3 is not configured. */
  @IsOptional()
  @IsString()
  bufferBase64?: string;
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
    return this.media.complete(dto.storageKey, dto.altPt, dto.bufferBase64);
  }
}
