import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

/**
 * Build archive from widget folder
 * @param {String} widgetFolder
 * @param {String} zipPath
 * @return {Promise<String>} path to archive
 */
export async function makeZipArchive(widgetFolder, zipPath = 'widget.zip') {
    return await new Promise((resolve, reject) => {
        const widgetPath = path.resolve(zipPath);
        const widgetFileStream = fs.createWriteStream(widgetPath);

        const archive = archiver('zip', {
            zlib: {level: 1}
        });

        widgetFileStream.on('close', () => {
            resolve(widgetPath);
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(widgetFileStream);
        archive.directory(path.resolve(widgetFolder), false);
        archive.finalize();
    });
}
