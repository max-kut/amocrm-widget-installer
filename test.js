import pkg from './dist/widget-installer.cjs';
const {WidgetInstaller} = pkg;
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

const __dirname = path.resolve();
dotenv.config();

const widgetPath = path.resolve(__dirname, './widget.zip');

if (!fs.existsSync(widgetPath)) {
    console.log('widget.zip not defined!');
} else {
    const wi = new WidgetInstaller(
        process.env.AMO_SUBDOMAIN,
        process.env.AMO_LOGIN,
        process.env.AMO_PASSWORD,
        widgetPath,
        process.env.APP_URL.replace(/\/*$/, '') + '/amocrm/auth',
        'ru',
        false
    );

    wi.upload().then(() => {
        console.log('Widget uploaded!');
    }).catch(e => {
        console.log(e.toString())
    });
}