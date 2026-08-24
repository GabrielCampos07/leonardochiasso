import { Allow, IsString, MaxLength, MinLength } from 'class-validator';

/** Nested JSON field patch for CMS editors (arte / joias / lookbooks / …). */
export class PatchContentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  path!: string;

  @Allow()
  value!: unknown;
}
