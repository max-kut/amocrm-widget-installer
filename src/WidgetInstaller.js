import fs from 'fs';
import contentType from 'content-type';
import get from 'lodash/get';
import request from 'request-promise';
import { JSDOM } from 'jsdom';
import ZipReader from './ZipReader';


export default class WidgetInstaller {
    subDomain;
    login;
    password;
    widgetZipPath;
    redirectUri;
    defaultLocale;
    amoMarket;

    widget_uuid = null;
    _request;

    /**
     * @param {String} subDomain
     * @param {String} login
     * @param {String} password
     * @param {String} widgetZipPath
     * @param {String} redirectUri
     * @param {String} defaultLocale
     * @param {Boolean} amoMarket
     */
    constructor(
        subDomain,
        login,
        password,
        widgetZipPath = 'widget.zip',
        redirectUri = 'https://amocrm.ru/',
        defaultLocale = 'ru',
        amoMarket = true
    ) {
        this.login = login;
        this.password = password;
        this.subDomain = subDomain;
        this.redirectUri = redirectUri;
        this.defaultLocale = defaultLocale;
        this.amoMarket = amoMarket;

        this.widgetZipPath = widgetZipPath;
        this.zipReader = new ZipReader(widgetZipPath);


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

        const wigetUUID = await this._findWidgetUUID(widgetName);

        if (wigetUUID === null) {
            const { uuid } = await this._request.post(this._url(`/v3/clients/`), {
                json: this._getWidgetData(wigetUUID)
            });
            await this._uploadWidget(uuid);
        } else {
            const { uuid } = await this._request.patch(this._url(`/v3/clients/${wigetUUID}`), {
                json: this._getWidgetData(wigetUUID)
            });
            await this._uploadWidget(uuid);
        }
    }

    /**
     * @param {String} path 
     * @returns {String}
     */
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
            const { response } = e;
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

    /**
     * 
     * @param {String} name 
     * @returns {String|null}
     */
    async _findWidgetUUID(name) {
        if (!name) {
            throw new Error('name is required')
        }

        const getUUIDFromMarket = async () => {
            const pageSize = 20;
            let page = 1;
            let countItems;
            do {
                const {integrations} = await this._request.get(this._url(`/ajax/settings/widgets/category/own_integrations/${page}/`));

                countItems = Object.keys(integrations).length;
                page++;

                for (const code in integrations) {
                    if (integrations[code].type === 'widget' && name === integrations[code].name) {
                        return integrations[code].client.uuid;
                    }
                }
            } while (countItems >= pageSize);

            return null;
        };
        const getUUIDFromLegacy = async () => {
            const { widgets } = await this._request.get(this._url(`/ajax/settings/widgets/category/own_integrations/1/`));

            for (const type in widgets.own_integrations) {
                const integrations = widgets.own_integrations[type];
                for (const code in integrations) {
                    if (integrations[code].type === 'widget' && name === integrations[code].name) {
                        return integrations[code].client.uuid;
                    }
                }
            }

            return null;
        };


        return this.amoMarket ? await getUUIDFromMarket() : await getUUIDFromLegacy();
    }

    _getWidgetData(wigetUUID) {
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
            uuid: wigetUUID
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
