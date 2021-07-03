import AdmZip from 'adm-zip';
import fs from 'fs';

export default class ZipReader {
    zip;

    constructor(zipArchivePath) {
        if (!fs.existsSync(zipArchivePath)) {
            throw new Error(`file "${zipArchivePath}" not defined!`);
        }
        this.zip = new AdmZip(fs.readFileSync(zipArchivePath));
    }

    getFileAsString(path) {
        return this.zip.getEntry(path).getData().toString('utf8');
    }
}
