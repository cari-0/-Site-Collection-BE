import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class UploadsService {
  async save(file: Express.Multer.File) {
    const ext = EXT[file.mimetype] ?? '.bin';
    const imageKey = `${randomBytes(16).toString('hex')}${ext}`;
    const dir = join(process.cwd(), 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, imageKey), file.buffer);

    const base =
      process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
    return { imageKey, imageUrl: `${base}/uploads/${imageKey}` };
  }
}
