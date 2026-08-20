import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [AdminModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
