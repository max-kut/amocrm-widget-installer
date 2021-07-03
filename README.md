# amoCRM widget installer

Сервис, который упаковывает директорию в zip-архив и загружает в аккаунт amoCRM. 
Если в amoCRM виджет не существует, он будет создан, иначе будет обновлен.

## Установка
```bash
$ npm install --save-dev @amopro/widget-installer
```

## Использование
```javascript
const path = require('path');
const WIDGET_DIR = path.resolve('widget');

// ...
// Здесь вы собираете виджет в папку "widget"
// ...

try {
    const installer = require('@amopro/widget-installer');
    const {WidgetInstaller, makeZipArchive} = installer;

    console.log('Make widget archive...');
    
    const widgetZipPath = await makeZipArchive(WIDGET_DIR);
    
    console.log('Widget uploading...');
    const wi = new WidgetInstaller(
      process.env.AMO_SUB_DOMAIN,
      process.env.AMO_LOGIN,
      process.env.AMO_PASSWORD,
      widgetZipPath
    );
    
    await wi.upload();
    console.log('Widget uploaded!');

    // после загрузки можно удалить архив
    const fse = require('fs-extra'); 
    fse.removeSync(path.resolve('widget.zip'));
} catch (e) {
    console.error('uploading error', e.toString());
    throw e;
}

```
