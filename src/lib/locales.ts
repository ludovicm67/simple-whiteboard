import { configureLocalization, LocaleModule } from "@lit/localize";
import {
  sourceLocale,
  targetLocales,
  allLocales,
} from "../generated/locale-codes.js";

import * as templates_cs_cz from "../generated/locales/cs-CZ.js";
import * as templates_cs from "../generated/locales/cs.js";
import * as templates_de_de from "../generated/locales/de-DE.js";
import * as templates_de from "../generated/locales/de.js";
import * as templates_en_us from "../generated/locales/en-US.js";
// import * as templates_en from "../generated/locales/en.js"; // No need, as it is the source locale
import * as templates_es_ar from "../generated/locales/es-AR.js";
import * as templates_es_cl from "../generated/locales/es-CL.js";
import * as templates_es_co from "../generated/locales/es-CO.js";
import * as templates_es_es from "../generated/locales/es-ES.js";
import * as templates_es_mx from "../generated/locales/es-MX.js";
import * as templates_es_pe from "../generated/locales/es-PE.js";
import * as templates_es from "../generated/locales/es.js";
import * as templates_fr_fr from "../generated/locales/fr-FR.js";
import * as templates_fr from "../generated/locales/fr.js";
import * as templates_it_it from "../generated/locales/it-IT.js";
import * as templates_it from "../generated/locales/it.js";
import * as templates_pl_pl from "../generated/locales/pl-PL.js";
import * as templates_pl from "../generated/locales/pl.js";
import * as templates_pt_br from "../generated/locales/pt-BR.js";
import * as templates_pt_pt from "../generated/locales/pt-PT.js";
import * as templates_pt from "../generated/locales/pt.js";
import * as templates_tr_tr from "../generated/locales/tr-TR.js";
import * as templates_tr from "../generated/locales/tr.js";

export type SupportedLocales = (typeof allLocales)[number];

export const supportedLocales = [...allLocales] as SupportedLocales[];

const localizedTemplates = new Map<SupportedLocales, LocaleModule>([
  ["cs-CZ", templates_cs_cz],
  ["cs", templates_cs],
  ["de-DE", templates_de_de],
  ["de", templates_de],
  ["en-US", templates_en_us],
  // ["en", templates_en],
  ["es-AR", templates_es_ar],
  ["es-CL", templates_es_cl],
  ["es-CO", templates_es_co],
  ["es-ES", templates_es_es],
  ["es-MX", templates_es_mx],
  ["es-PE", templates_es_pe],
  ["es", templates_es],
  ["fr-FR", templates_fr_fr],
  ["fr", templates_fr],
  ["it-IT", templates_it_it],
  ["it", templates_it],
  ["pl-PL", templates_pl_pl],
  ["pl", templates_pl],
  ["pt-BR", templates_pt_br],
  ["pt-PT", templates_pt_pt],
  ["pt", templates_pt],
  ["tr-TR", templates_tr_tr],
  ["tr", templates_tr],
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
