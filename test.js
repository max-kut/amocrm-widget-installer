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
    const wi = new WidgetInstaller({
        subDomain: process.env.AMO_SUBDOMAIN,
        login: process.env.AMO_LOGIN,
        password: process.env.AMO_PASSWORD,
        widgetZipPath: widgetPath,
        redirectUri: process.env.APP_URL + '/amocrm/auth',
        revokeAccessHookUri: process.env.APP_URL + '/amocrm/destroy',
    });

    wi.upload().then(() => {
        console.log('Widget uploaded!');
    }).catch(e => {
        console.log(e.toString())
    });
}