# amoCRM widget installer

Сервисный класс, который упаковывает директорию в zip-архив и загружает в аккаунт amoCRM. Если в amoCRM виджет не сущестует, он будет создан, иначе будет обновлен.

## Установка
```bash
$ npm install --save-dev @amopro/widget-installer
```

## Использование
```javascript
const path = require('path');
const WIDGET_DIR = path.resolve('widget');

// ...
// Здесь собирается виджет в папку "widget"
// ...

try {
    const WidgetInstaller = require('@amopro/widget-installer');
    const wi = new WidgetInstaller(
      process.env.AMO_SUB_DOMAIN,
      process.env.AMO_LOGIN,
      process.env.AMO_PASSWORD,
      WIDGET_DIR
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
