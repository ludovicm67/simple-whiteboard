import i18next, { i18n, TFunction } from "i18next";

const locales = import.meta.glob("../../locales/*.json", { eager: true });

const getLocaleContent = async (locale: string): Promise<any> => {
  const match = locales[`../../locales/${locale}.json`] as { default: any };
  return match?.default;
};

export class I18nContext {
  private instance: i18n;
  private _t: TFunction | ((key: string) => string) = (key: string) => key;

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

  /**
   * Translate a key, optionally interpolating values into it (`{{name}}`).
   *
   * @param key The translation key.
   * @param params Values for the placeholders the translation contains.
   * @returns The translated string, or the key itself when unavailable.
   */
  public t(
    key: string,
    params?: Record<string, string | number>
  ): string {
    if (!this || !this._t) {
      console.error(
        "I18nContext is not initialized, please call it the following way: const i18n = whiteboard.getI18nContext(); i18n.t('your_key')"
      );
      return key;
    }
    // The i18next overloads do not describe "key plus interpolation values",
    // which is exactly what this thin wrapper exists to offer.
    const translate = this._t as (
      key: string,
      params?: Record<string, string | number>
    ) => string;
    return translate(key, params);
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
