import i18next, { i18n, TFunction } from "i18next";

const getLocaleContent = async (locale: string): Promise<any> => {
  const content = (await import(`../../locales/${locale}`)).default;
  return content;
};

export class I18nContext {
  private instance: i18n;
  private _t = (key: string) => key;

  constructor() {
    this.instance = i18next.createInstance(
      {
        lng: "en",
        fallbackLng: "en",
        debug: false,
        resources: {},
      },
      (err, _t) => {
        if (err) {
          console.error(err);
        } else {
          this._t = _t;
        }
      }
    );
    this.init();
  }

  public async init(): Promise<void> {
    await Promise.all(
      [
        "cs-CZ",
        "cs",
        "de-DE",
        "de",
        "en-US",
        "en",
        "es-AR",
        "es-CL",
        "es-CO",
        "es-ES",
        "es-MX",
        "es-PE",
        "es",
        "fr-FR",
        "fr",
        "it-IT",
        "it",
        "pl-PL",
        "pl",
        "pt-BR",
        "pt-PT",
        "pt",
        "tr-TR",
        "tr",
      ].map(async (locale) => {
        this.instance.addResourceBundle(
          locale,
          "translation",
          await getLocaleContent(locale)
        );
      })
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
