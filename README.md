# amoCRM widget installer

Сервис, который упаковывает директорию в zip-архив и загружает в аккаунт amoCRM. 
Если в amoCRM виджет не существует, он будет создан, иначе будет обновлен.

Обратите внимание, что с 2022-06-08 amoCRM добавила amoМаркет. Если аккаунт обновился и имеет доступ к маркету (вместо раздела Настройки -> Интеграции), то в конструкторе `WidgetInstaller` можете указать `true` пятым аргументом. Иначе укажате `false`.

## Установка
```bash
# npm
npm install --save-dev @amopro/widget-installer
# or yarn
yarn add --dev @amopro/widget-installer
```

## Использование

Вы можете посмотреть заготовку виджета в репозитории [amocrm-widget-starter-kit](https://github.com/max-kut/amocrm-widget-starter-kit)


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
      widgetZipPath, 
      'ru',     // локаль виджета по умолчанию
      true      // true - если аккаунт имеет доступ к amoМаркет (с 2022-06-08)
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
