import { configureLocalization, LocaleModule } from "@lit/localize";
import {
  sourceLocale,
  targetLocales,
  allLocales,
} from "../generated/locale-codes.js";

import * as templates_de from "../generated/locales/de.js";
import * as templates_fr from "../generated/locales/fr.js";

export type SupportedLocales = (typeof allLocales)[number];

export const supportedLocales = [...allLocales] as SupportedLocales[];

const localizedTemplates = new Map<SupportedLocales, LocaleModule>([
  ["de", templates_de],
  ["fr", templates_fr],
]);

export const { getLocale, setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: (locale: string) =>
    new Promise((resolve, reject) => {
      const resolvedLocale = localizedTemplates.get(locale as SupportedLocales);
      if (!resolvedLocale) {
        reject(new Error(`Invalid locale: ${locale}`));
        return;
      }
      resolve(resolvedLocale);
    }),
});
