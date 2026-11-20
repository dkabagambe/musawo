import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.join(__dirname, '../public');

const IMAGE_DIRS = [
  path.join(publicDir, 'assets'),
  path.join(publicDir, 'icons'),
  path.join(publicDir, 'uploads'),
];

const COMPRESSION_CONFIG = {
  jpeg: { quality: 80, progressive: true },
  png: { compressionLevel: 9 },
  webp: { quality: 80 },
};

async function compressImage(filePath: string) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    const originalSize = stats.size;

    let compressed;

    if (ext === '.jpg' || ext === '.jpeg') {
      compressed = sharp(filePath)
        .jpeg(COMPRESSION_CONFIG.jpeg)
        .toBuffer();
    } else if (ext === '.png') {
      compressed = sharp(filePath)
        .png(COMPRESSION_CONFIG.png)
        .toBuffer();
    } else if (ext === '.webp') {
      compressed = sharp(filePath)
        .webp(COMPRESSION_CONFIG.webp)
        .toBuffer();
    } else if (ext === '.gif') {
      // GIFs are complex, skip them
      return;
    } else {
      return;
    }

    const compressedBuffer = await compressed;
    const newSize = compressedBuffer.length;
    const percentReduced = ((originalSize - newSize) / originalSize * 100).toFixed(2);

    if (newSize < originalSize) {
      fs.writeFileSync(filePath, compressedBuffer);
      console.log(`✓ ${path.basename(filePath)}: ${(originalSize / 1024).toFixed(2)}KB → ${(newSize / 1024).toFixed(2)}KB (${percentReduced}% reduction)`);
    } else {
      console.log(`- ${path.basename(filePath)}: Already optimized`);
    }
  } catch (error) {
    console.error(`✗ Error compressing ${filePath}:`, (error as Error).message);
  }
}

async function walkDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await walkDir(filePath);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        await compressImage(filePath);
      }
    }
  }
}

async function main() {
  console.log('🖼️  Starting image compression...\n');

  for (const dir of IMAGE_DIRS) {
    console.log(`📁 Processing ${path.relative(publicDir, dir)}/`);
    await walkDir(dir);
    console.log('');
  }

  console.log('✅ Image compression complete!');
}

main().catch(console.error);
