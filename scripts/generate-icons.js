/**
 * Generate circular masked favicon icons from macattak.png
 * Creates multiple sizes for different use cases using Sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateCircularIcon(inputPath, outputPath, size) {
  // Create a circular mask SVG
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
    </svg>`
  );

  // Process image: resize and apply circular mask
  await sharp(inputPath)
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
    })
    .composite([
      {
        input: circleMask,
        blend: 'dest-in',
      },
    ])
    .png()
    .toFile(outputPath);

  console.log(`✓ Created ${path.basename(outputPath)} (${size}x${size})`);
}

async function generateFavicon(inputPath, outputPath) {
  // For favicon.ico, create a 32x32 circular PNG first
  const tempPng = path.join(path.dirname(outputPath), 'temp-favicon.png');

  const circleMask = Buffer.from(
    `<svg width="32" height="32">
      <circle cx="16" cy="16" r="16" fill="white"/>
    </svg>`
  );

  await sharp(inputPath)
    .resize(32, 32, {
      fit: 'cover',
      position: 'center',
    })
    .composite([
      {
        input: circleMask,
        blend: 'dest-in',
      },
    ])
    .png()
    .toFile(tempPng);

  // Rename to .ico (browsers accept PNG as .ico)
  fs.renameSync(tempPng, outputPath);
  console.log(`✓ Created ${path.basename(outputPath)} (32x32)`);
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  const appDir = path.join(__dirname, '..', 'src', 'app');
  const inputImage = path.join(publicDir, 'macattak.png');

  console.log('🎨 Generating circular favicon icons...\n');

  // Verify input exists
  if (!fs.existsSync(inputImage)) {
    console.error(`❌ Error: ${inputImage} not found`);
    process.exit(1);
  }

  // Create app directory if it doesn't exist
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }

  try {
    // Generate different sizes
    await generateFavicon(inputImage, path.join(appDir, 'favicon.ico'));
    await generateCircularIcon(inputImage, path.join(appDir, 'icon.png'), 192);
    await generateCircularIcon(
      inputImage,
      path.join(appDir, 'apple-icon.png'),
      180
    );

    console.log('\n✅ All icons generated successfully!');
    console.log('\nFiles created:');
    console.log('  • src/app/favicon.ico (32x32)');
    console.log('  • src/app/icon.png (192x192)');
    console.log('  • src/app/apple-icon.png (180x180)');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

main();
