import { Body, Controller, Get, Header, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { ContentService } from './content.service';

class PatchContentDto {
  path!: string;
  value!: unknown;
}

@Controller('api')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('joias')
  @Header('Cache-Control', 'public, max-age=60')
  listJoias() {
    return this.content.list('joia').then((rows) => rows.map((r) => ({ slug: r.slug, ...asRecord(r.data) })));
  }

  @Get('joias/:slug')
  @Header('Cache-Control', 'public, max-age=60')
  getJoia(@Param('slug') slug: string) {
    return this.content.get('joia', slug).then((row) => {
      if (!row) return null;
      return { slug: row.slug, ...asRecord(row.data) };
    });
  }

  @Get('arte')
  @Header('Cache-Control', 'public, max-age=60')
  listArte() {
    return this.content.list('arte-series').then((rows) =>
      rows.map((r) => ({ slug: r.slug, ...asRecord(r.data) })),
    );
  }

  @Get('alta-costura/wearers')
  @Header('Cache-Control', 'public, max-age=60')
  listWearers() {
    return this.content.list('wearer').then((rows) =>
      rows.map((r) => ({ id: r.slug, ...asRecord(r.data) })),
    );
  }

  @Get('lookbooks/:slug')
  @Header('Cache-Control', 'public, max-age=60')
  getLookbook(@Param('slug') slug: string) {
    return this.content.get('lookbook', slug).then((row) => {
      if (!row) return null;
      return { slug: row.slug, ...asRecord(row.data) };
    });
  }

  @Get('desfiles/:slug')
  @Header('Cache-Control', 'public, max-age=60')
  getDesfile(@Param('slug') slug: string) {
    return this.content.get('desfile', slug).then((row) => {
      if (!row) return null;
      return { slug: row.slug, ...asRecord(row.data) };
    });
  }

  @Patch('admin/content/:kind/:slug')
  @UseGuards(AdminGuard)
  patch(
    @Param('kind') kind: string,
    @Param('slug') slug: string,
    @Body() dto: PatchContentDto,
  ) {
    return this.content.patch(kind, slug, dto.path, dto.value);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
