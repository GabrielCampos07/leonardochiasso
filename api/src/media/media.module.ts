import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [AdminModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
