import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const theme = readFileSync('src/styles.css', 'utf8').match(/--bg:\s*(#[0-9a-fA-F]{6})/)[1];

function pngSize(path) {
  const data = readFileSync(path);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(data.subarray(12, 16).toString(), 'IHDR');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

test('raster icons match the favicon artwork sizes', () => {
  assert.deepEqual(pngSize('public/favicon-32x32.png'), { width: 32, height: 32 });
  assert.deepEqual(pngSize('public/apple-touch-icon.png'), { width: 180, height: 180 });
  assert.deepEqual(pngSize('public/icon-192.png'), { width: 192, height: 192 });
  assert.deepEqual(pngSize('public/icon-512.png'), { width: 512, height: 512 });

  const ico = readFileSync('public/favicon.ico');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 2);
  assert.equal(ico[6], 16);
  assert.equal(ico[7], 16);
  assert.equal(ico[22], 32);
  assert.equal(ico[23], 32);
});

test('index.html keeps the SVG favicon and links the raster icons', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /<link rel="icon" href="\.\/favicon\.svg" type="image\/svg\+xml" \/>/);
  assert.match(html, /<link rel="icon" href="\.\/favicon-32x32\.png" type="image\/png" sizes="32x32" \/>/);
  assert.match(html, /<link rel="icon" href="\.\/favicon\.ico" sizes="16x16 32x32" \/>/);
  assert.match(html, /<link rel="apple-touch-icon" href="\.\/apple-touch-icon\.png" \/>/);
  assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest" \/>/);
  assert.match(html, new RegExp(`<meta name="theme-color" content="${theme}" \\/>`));
});

test('manifest is a standalone Chess Lab app using the site theme', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.name, 'Chess Lab');
  assert.equal(manifest.short_name, 'Chess Lab');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, theme);
  assert.equal(manifest.background_color, theme);
  assert.deepEqual(
    manifest.icons.map((icon) => [icon.src, icon.sizes, icon.type]),
    [
      ['./icon-192.png', '192x192', 'image/png'],
      ['./icon-512.png', '512x512', 'image/png'],
    ],
  );
});
