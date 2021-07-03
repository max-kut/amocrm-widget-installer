import fs from 'fs';
import contentType from 'content-type';
import get from 'lodash/get';
import request from 'request-promise';
import {JSDOM} from 'jsdom';
import ZipReader from './ZipReader';


export default class WidgetInstaller {
    /**
     * @param {String} subDomain
     * @param {String} login
     * @param {String} password
     * @param {String} widgetZipPath
     * @param {String} redirectUri
     * @param {String} defaultLocale
     */
    constructor(
      subDomain,
      login,
      password,
      widgetZipPath = 'widget.zip',
      redirectUri = 'https://amocrm.ru/',
      defaultLocale = 'ru'
    ) {
        this.login = login;
        this.password = password;
        this.subDomain = subDomain;
        this.redirectUri = redirectUri;
        this.defaultLocale = defaultLocale;

        this.widgetZipPath = widgetZipPath;
        this.zipReader = new ZipReader(widgetZipPath);

        this.widget_uuid = null;

        this._request = request.defaults({
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:51.0) Gecko/20100101 Firefox/51.0',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': this._url('/settings/widgets/')
            },
            jar: true,
            transform: (body, response) => {
                const ct = contentType.parse(response.headers['content-type']);
                if (ct.type === 'application/json' || ct.type === 'text/json') {
                    try {
                        return JSON.parse(body);
                    } catch (e) {
                        return body;
                    }
                }

                return body;
            }
        });
    }

    async upload() {
        await this._createAuthenticatedSession();

        const widgetName = await this._getManifestLocalizedValue('widget.name');

        await this._findWidgetData(widgetName);

        if (this.widget_uuid === null) {
            const {uuid} = await this._request.post(this._url(`/v3/clients/`), {
                json: this._getWidgetData()
            });
            await this._uploadWidget(uuid);
        } else {
            const {uuid} = await this._request.patch(this._url(`/v3/clients/${this.widget_uuid}`), {
                json: this._getWidgetData()
            });
            await this._uploadWidget(uuid);
        }
    }

    _url(path) {
        return `https://${this.subDomain}.amocrm.ru/` + path.replace(/^\/*(.*)/, '$1')
    }

    /**
     * Create amocrm session
     * @private
     */
    async _createAuthenticatedSession() {
        let csrfToken;
        try {
            // this request has 401 response
            await this._request.get(this._url(`/`));
        } catch (e) {
            const {response} = e;
            const dom = new JSDOM(response);
            csrfToken = dom.window.document.querySelector('input[name="csrf_token"]').value;
        }

        await this._request.post(this._url(`/oauth2/authorize`), {
            headers: {
                Referer: this._url(`/`)
            },
            json: {
                csrf_token: csrfToken,
                username: this.login,
                password: this.password,
                temporary_auth: 'N'
            }
        });
    }

    async _findWidgetData(name) {
        if (!name) {
            throw new Error('name is required')
        }

        const {widgets} = await this._request.get(this._url(`/ajax/settings/widgets/category/own_integrations/1/`));

        for (const type of Object.keys(widgets.own_integrations)) {
            const integrations = widgets.own_integrations[type];
            for (const code in integrations) if (integrations.hasOwnProperty(code)) {
                if (integrations[code].type === 'widget' && name === integrations[code].name) {
                    this.widget_uuid = integrations[code].client.uuid;
                    return;
                }
            }
        }

        return null;
    }

    _getWidgetData() {
        return {
            name: {
                en: this._getManifestLocalizedValue('widget.name', 'en') || "",
                es: this._getManifestLocalizedValue('widget.name', 'es') || "",
                pt: this._getManifestLocalizedValue('widget.name', 'pt') || "",
                ru: this._getManifestLocalizedValue('widget.name', 'ru') || ""
            },
            description: {
                en: this._getManifestLocalizedValue('widget.description', 'en') || "",
                es: this._getManifestLocalizedValue('widget.description', 'es') || "",
                pt: this._getManifestLocalizedValue('widget.description', 'pt') || "",
                ru: this._getManifestLocalizedValue('widget.description', 'ru') || ""
            },
            redirect_uri: this.redirectUri,
            scopes: ['crm', 'notifications'],
            uuid: this.widget_uuid
        };
    }

    _getManifest() {
        if (typeof this._manifest === 'undefined') {
            this._manifest = JSON.parse(this.zipReader.getFileAsString('manifest.json'));
        }
        return this._manifest;
    }

    /**
     * Получает локализованное значение из манифеста
     * @param {string} key - path in dot notation
     * @param {string} locale
     * @returns {*}
     * @private
     */
    _getManifestLocalizedValue(key, locale = null) {
        locale = locale || this.defaultLocale;
        if (typeof this._manifest_i18n === 'undefined' || typeof this._manifest_i18n[locale] === 'undefined') {
            this._manifest_i18n = this._manifest_i18n || {};
            try {
                this._manifest_i18n[locale] = JSON.parse(this.zipReader.getFileAsString(`i18n/${locale}.json`));
            } catch (e) {
                return null;
            }
        }

        return get(this._manifest_i18n[locale], key, get(this._getManifest(), key));
    }

    /**
     * @param {String} uuid
     * @return {Promise<void>}
     * @private
     */
    async _uploadWidget(uuid) {
        await this._request.post(this._url(`/ajax/widgets/${uuid}/widget/upload/?fileapi${Date.now()}`), {
            formData: {
                'widget': {
                    value: fs.createReadStream(this.widgetZipPath),
                    options: {
                        filename: 'widget.zip',
                        contentType: 'application/x-zip-compressed'
                    }
                },
                '_widget': 'widget.zip',
            }
        });
    }
}
