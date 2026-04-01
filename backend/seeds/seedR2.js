/**
 * One-time script to upload existing local game files + SDK to Cloudflare R2.
 * Run: node seeds/seedR2.js
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { uploadToR2 } = require('../config/r2');

const GAMES_DIR = path.resolve(__dirname, '../../frontend/public/games');
const SDK_PATH = path.resolve(__dirname, '../../frontend/public/sdk/gamezone-sdk.js');

async function uploadDir(localDir, r2Prefix) {
    const items = fs.readdirSync(localDir);
    for (const item of items) {
        const full = path.join(localDir, item);
        const key = r2Prefix ? `${r2Prefix}/${item}` : item;
        if (fs.statSync(full).isDirectory()) {
            await uploadDir(full, key);
        } else {
            console.log(`  Uploading: ${key}`);
            await uploadToR2(key, fs.readFileSync(full));
        }
    }
}

async function main() {
    // Upload SDK
    console.log('Uploading SDK...');
    await uploadToR2('sdk/gamezone-sdk.js', fs.readFileSync(SDK_PATH));
    console.log('  sdk/gamezone-sdk.js ✓');

    // Upload each game folder
    const gameFolders = fs.readdirSync(GAMES_DIR).filter(f => {
        return fs.statSync(path.join(GAMES_DIR, f)).isDirectory();
    });

    for (const folder of gameFolders) {
        console.log(`\nUploading game: ${folder}`);
        await uploadDir(path.join(GAMES_DIR, folder), folder);
    }

    console.log('\n✅ All files uploaded to R2!');
}

main().catch(err => {
    console.error('Upload failed:', err);
    process.exit(1);
});
