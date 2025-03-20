import i18next, { i18n, TFunction } from "i18next";

export class I18nContext {
  private instance: i18n;
  private _t = (key: string) => key;

  constructor() {
    this.instance = i18next.createInstance(
      {
        lng: "en",
        fallbackLng: "en",
        debug: true,
        resources: {
          en: {
            translation: {
              key: "hello world",
              "menu-export": "Export",
              "tool-options-stroke-width": "Stroke Width",
            },
          },
          de: {
            translation: {
              key: "hallo welt",
              "menu-export": "Exportieren",
              "tool-options-stroke-width": "Strichstärke",
            },
          },
          fr: {
            translation: {
              key: "bonjour le monde",
              "menu-export": "Exporter",
              "tool-options-stroke-width": "Épaisseur du trait",
            },
          },
        },
      },
      (err, _t) => {
        if (err) {
          console.error(err);
        } else {
          this._t = _t;
        }
      }
    );
  }

  public t(key: string): string {
    if (!this || !this._t) {
      console.error(
        "I18nContext is not initialized, please call it the following way: const i18n = whiteboard.getI18nContext(); i18n.t('your_key')"
      );
      return key;
    }
    return this._t(key);
  }

  public async setLocale(lng: string): Promise<TFunction> {
    return this.instance.changeLanguage(lng);
  }

  public getSupportedLocales(): readonly string[] {
    return [...this.instance.languages];
  }

  public getLocale(): string {
    return this.instance.language;
  }

  public getInstance(): i18n {
    return this.instance;
  }
}
