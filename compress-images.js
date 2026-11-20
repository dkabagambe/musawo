const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, './public');

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

async function compressImage(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    const originalSize = stats.size;

    let pipeline = sharp(filePath);

    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg(COMPRESSION_CONFIG.jpeg);
    } else if (ext === '.png') {
      pipeline = pipeline.png(COMPRESSION_CONFIG.png);
    } else if (ext === '.webp') {
      pipeline = pipeline.webp(COMPRESSION_CONFIG.webp);
    } else {
      return;
    }

    const compressedBuffer = await pipeline.toBuffer();
    const newSize = compressedBuffer.length;
    const percentReduced = ((originalSize - newSize) / originalSize * 100).toFixed(2);

    if (newSize < originalSize) {
      fs.writeFileSync(filePath, compressedBuffer);
      console.log(`✓ ${path.basename(filePath)}: ${(originalSize / 1024).toFixed(2)}KB → ${(newSize / 1024).toFixed(2)}KB (${percentReduced}% reduction)`);
    } else {
      console.log(`- ${path.basename(filePath)}: Already optimized`);
    }
  } catch (error) {
    console.error(`✗ Error compressing ${path.basename(filePath)}:`, error.message);
  }
}

async function walkDir(dir) {
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
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        await compressImage(filePath);
      }
    }
  }
}

async function main() {
  console.log('🖼️  Starting image compression...\n');

  for (const dir of IMAGE_DIRS) {
    const relPath = path.relative(publicDir, dir);
    console.log(`📁 Processing ${relPath}/`);
    await walkDir(dir);
    console.log('');
  }

  console.log('✅ Image compression complete!');
}

main().catch(console.error);
