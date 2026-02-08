import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 192, name: 'maskable-icon-192x192.png', maskable: true },
  { size: 512, name: 'maskable-icon-512x512.png', maskable: true },
];

async function generateIcons() {
  const inputPath = path.join(__dirname, 'public', 'icon-source.png');
  const outputDir = path.join(__dirname, 'public', 'icons');

  // Check if source image exists
  try {
    await fs.access(inputPath);
    console.log('✓ Found source image at public/icon-source.png');
  } catch (error) {
    console.error('✗ Please save your generated favicon as public/icon-source.png');
    console.error('  The image should be at least 512x512px');
    process.exit(1);
  }

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🎨 Generating PWA icons...\n');

  for (const { size, name, maskable } of sizes) {
    try {
      let image = sharp(inputPath);

      if (maskable) {
        // Add safe area padding for maskable icons (80% of icon)
        const padding = Math.round(size * 0.1);
        image = image.resize(size - padding * 2, size - padding * 2, {
          fit: 'contain',
          background: { r: 236, g: 253, b: 245, alpha: 1 } // emerald-50
        }).extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 236, g: 253, b: 245, alpha: 1 }
        });
      } else {
        image = image.resize(size, size, {
          fit: 'contain',
          background: { r: 236, g: 253, b: 245, alpha: 1 }
        });
      }

      await image.png().toFile(path.join(outputDir, name));
      console.log(`  ✓ Generated ${name} (${size}x${size}px)`);
    } catch (error) {
      console.error(`  ✗ Failed to generate ${name}:`, error.message);
    }
  }

  // Generate favicon.ico (combined 16x16, 32x32, 48x48)
  console.log('\n📦 Generating favicon.ico...');
  try {
    await sharp(inputPath)
      .resize(32, 32, { fit: 'contain', background: { r: 236, g: 253, b: 245, alpha: 1 } })
      .png()
      .toFile(path.join(__dirname, 'public', 'favicon.png'));
    
    console.log('  ✓ Generated favicon.png (use online converter for .ico)');
    console.log('    Recommended: https://favicon.io/favicon-converter/');
  } catch (error) {
    console.error('  ✗ Failed to generate favicon:', error.message);
  }

  console.log('\n✨ Done! All icons generated successfully!');
  console.log('\n📝 Next steps:');
  console.log('  1. Convert favicon.png to favicon.ico at https://favicon.io/favicon-converter/');
  console.log('  2. Place favicon.ico in the public/ directory');
  console.log('  3. Icons are ready for PWA in public/icons/');
}

generateIcons().catch(console.error);
