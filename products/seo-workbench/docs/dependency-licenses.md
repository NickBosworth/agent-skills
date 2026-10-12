# Dependency licence review — development preview

Installed locked production and optional npm metadata reviewed on 2026-10-12.
The current macOS installation contains 149 distinct dependency/version identities.
Every selected package declares a licence; the table records those declarations,
not a legal assessment. Development-only dependencies are excluded. Upstream environment-detection packages
may have container-related names; they do not install or run a container service. Platform-specific
packages not installed on this computer are not covered by this inventory.

The runtime is MIT; existing skills retain their licences. Dependencies install
independently and retain their notices. This product does not relicense them or
claim their code under its own MIT licence. The bundled bounded
Schema.org vocabulary has separate CC-BY-SA-3.0 attribution in NOTICE.md.

Lighthouse's installed axe-core dependency declares MPL-2.0. Its licence and notices
remain with that dependency. A source/package dependency declaration is separate
from bundling its code in a distributed executable or image. Distribution review
must account for the actual artifact and any applicable source/notice obligations;
see [Mozilla's MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/).

This metadata inventory is not a legal certification. Chromium and operating-system
packages installed outside this product are separate distributions. Review the
actual package and any bundled dependencies before publishing. Local Chromium is downloaded separately by its
operator, rather than bundled into this repository or the workbench package. No npm package or release has been published. Review lock updates and external distributions.

| Package                             | Version      | Declared licence |
| ----------------------------------- | ------------ | ---------------- |
| @formatjs/ecma402-abstract          | 2.3.6        | MIT              |
| @formatjs/fast-memoize              | 2.2.7        | MIT              |
| @formatjs/icu-messageformat-parser  | 2.11.4       | MIT              |
| @formatjs/icu-skeleton-parser       | 1.8.16       | MIT              |
| @formatjs/intl-localematcher        | 0.6.2        | MIT              |
| @modelcontextprotocol/core          | 2.3.1        | Apache-2.0       |
| @modelcontextprotocol/server        | 2.3.1        | Apache-2.0       |
| @nodable/entities                   | 3.1.0        | MIT              |
| @opentelemetry/api                  | 1.9.1        | Apache-2.0       |
| @opentelemetry/api-logs             | 0.220.0      | Apache-2.0       |
| @opentelemetry/core                 | 2.12.0       | Apache-2.0       |
| @opentelemetry/instrumentation      | 0.220.0      | Apache-2.0       |
| @opentelemetry/resources            | 2.12.0       | Apache-2.0       |
| @opentelemetry/sdk-trace            | 2.12.0       | Apache-2.0       |
| @opentelemetry/sdk-trace-base       | 2.12.0       | Apache-2.0       |
| @opentelemetry/semantic-conventions | 1.43.0       | Apache-2.0       |
| @paulirish/trace_engine             | 0.0.65       | BSD-3-Clause     |
| @puppeteer/browsers                 | 3.2.4        | Apache-2.0       |
| @sentry/conventions                 | 0.16.0       | MIT              |
| @sentry/core                        | 10.76.2      | MIT              |
| @sentry/node                        | 10.76.2      | MIT              |
| @sentry/node-core                   | 10.76.2      | MIT              |
| @sentry/opentelemetry               | 10.76.2      | MIT              |
| @sentry/server-utils                | 10.76.2      | MIT              |
| @types/node                         | 26.6.5       | MIT              |
| ajv                                 | 8.20.0       | MIT              |
| ajv-formats                         | 3.0.1        | MIT              |
| ansi-colors                         | 4.1.3        | MIT              |
| ansi-regex                          | 5.0.1        | MIT              |
| ansi-regex                          | 6.4.0        | MIT              |
| ansi-styles                         | 4.3.0        | MIT              |
| ansi-styles                         | 6.2.3        | MIT              |
| anynum                              | 1.0.1        | MIT              |
| atomically                          | 2.1.1        | MIT              |
| axe-core                            | 4.13.0       | MPL-2.0          |
| boolbase                            | 1.0.0        | ISC              |
| cheerio                             | 1.2.0        | MIT              |
| cheerio-select                      | 2.1.0        | BSD-2-Clause     |
| chrome-launcher                     | 1.2.2        | Apache-2.0       |
| chromium-bidi                       | 157.0.8090-0 | Apache-2.0       |
| cjs-module-lexer                    | 2.3.0        | MIT              |
| cliui                               | 8.0.1        | ISC              |
| cliui                               | 9.0.1        | ISC              |
| color-convert                       | 2.0.1        | MIT              |
| color-name                          | 1.1.4        | MIT              |
| configstore                         | 7.1.0        | BSD-2-Clause     |
| csp_evaluator                       | 1.1.8        | Apache-2.0       |
| css-select                          | 5.2.2        | BSD-2-Clause     |
| css-what                            | 6.2.2        | BSD-2-Clause     |
| debug                               | 4.4.3        | MIT              |
| decimal.js                          | 10.6.0       | MIT              |
| define-lazy-prop                    | 2.0.0        | MIT              |
| devtools-protocol                   | 0.0.1687809  | BSD-3-Clause     |
| devtools-protocol                   | 0.0.1696802  | BSD-3-Clause     |
| dom-serializer                      | 2.0.0        | MIT              |
| domelementtype                      | 2.3.0        | BSD-2-Clause     |
| domhandler                          | 5.0.3        | BSD-2-Clause     |
| domutils                            | 3.2.2        | BSD-2-Clause     |
| dot-prop                            | 9.0.0        | MIT              |
| emoji-regex                         | 10.6.0       | MIT              |
| emoji-regex                         | 8.0.0        | MIT              |
| encoding-sniffer                    | 0.2.1        | MIT              |
| enquirer                            | 2.4.1        | MIT              |
| entities                            | 4.5.0        | BSD-2-Clause     |
| entities                            | 6.0.1        | BSD-2-Clause     |
| entities                            | 7.0.1        | BSD-2-Clause     |
| es-module-lexer                     | 3.0.3        | MIT              |
| escalade                            | 3.2.0        | MIT              |
| escape-string-regexp                | 4.0.0        | MIT              |
| fast-deep-equal                     | 3.1.3        | MIT              |
| fast-uri                            | 3.1.8        | BSD-3-Clause     |
| fast-xml-builder                    | 1.3.1        | MIT              |
| fast-xml-parser                     | 5.11.2       | MIT              |
| get-caller-file                     | 2.0.5        | ISC              |
| get-east-asian-width                | 1.7.0        | MIT              |
| graceful-fs                         | 4.2.11       | ISC              |
| htmlparser2                         | 10.1.0       | MIT              |
| http-link-header                    | 1.1.4        | MIT              |
| iconv-lite                          | 0.6.3        | MIT              |
| image-ssim                          | 0.2.0        | MIT              |
| import-in-the-middle                | 3.5.2        | Apache-2.0       |
| intl-messageformat                  | 10.7.18      | BSD-3-Clause     |
| ipaddr.js                           | 2.5.0        | MIT              |
| is-docker                           | 2.2.1        | MIT              |
| is-fullwidth-code-point             | 3.0.0        | MIT              |
| is-unsafe                           | 2.0.2        | MIT              |
| is-wsl                              | 2.2.0        | MIT              |
| jpeg-js                             | 0.4.4        | BSD-3-Clause     |
| js-library-detector                 | 6.7.0        | MIT              |
| json-schema-traverse                | 1.0.0        | MIT              |
| legacy-javascript                   | 0.0.3        | Apache-2.0       |
| lighthouse                          | 13.5.0       | Apache-2.0       |
| lighthouse-logger                   | 2.0.2        | Apache-2.0       |
| lighthouse-stack-packs              | 1.12.3       | Apache-2.0       |
| lodash-es                           | 4.18.1       | MIT              |
| lookup-closest-locale               | 6.2.0        | MIT              |
| marky                               | 1.3.0        | Apache-2.0       |
| mitt                                | 3.0.1        | MIT              |
| modern-tar                          | 0.8.5        | MIT              |
| module-details-from-path            | 1.0.4        | MIT              |
| ms                                  | 2.1.3        | MIT              |
| nth-check                           | 2.1.1        | BSD-2-Clause     |
| open                                | 8.4.2        | MIT              |
| parse5                              | 7.3.0        | MIT              |
| parse5-htmlparser2-tree-adapter     | 7.1.0        | MIT              |
| parse5-parser-stream                | 7.1.2        | MIT              |
| path-expression-matcher             | 1.6.2        | MIT              |
| playwright                          | 1.64.0       | Apache-2.0       |
| playwright-core                     | 1.64.0       | Apache-2.0       |
| puppeteer-core                      | 25.13.0      | Apache-2.0       |
| require-directory                   | 2.1.1        | MIT              |
| require-from-string                 | 2.0.2        | MIT              |
| require-in-the-middle               | 8.0.1        | MIT              |
| robots-parser                       | 3.0.1        | MIT              |
| safer-buffer                        | 2.1.2        | MIT              |
| speedline-core                      | 1.4.3        | MIT              |
| string-width                        | 4.2.3        | MIT              |
| string-width                        | 7.2.0        | MIT              |
| string-width                        | 8.3.0        | MIT              |
| strip-ansi                          | 6.0.1        | MIT              |
| strip-ansi                          | 7.2.0        | MIT              |
| strnum                              | 2.5.1        | MIT              |
| stubborn-fs                         | 2.0.0        | MIT              |
| stubborn-utils                      | 1.0.2        | MIT              |
| third-party-web                     | 0.30.0       | MIT              |
| tldts-core                          | 7.4.18       | MIT              |
| tldts-icann                         | 7.4.18       | MIT              |
| tslib                               | 2.8.1        | 0BSD             |
| type-fest                           | 4.41.0       | (MIT OR CC0-1.0) |
| typed-query-selector                | 2.12.3       | MIT              |
| undici                              | 7.30.0       | MIT              |
| undici-types                        | 8.9.0        | MIT              |
| web-features                        | 3.42.0       | Apache-2.0       |
| webdriver-bidi-protocol             | 1.0.1        | Apache-2.0       |
| whatwg-encoding                     | 3.1.1        | MIT              |
| whatwg-mimetype                     | 4.0.0        | MIT              |
| when-exit                           | 2.1.5        | MIT              |
| wrap-ansi                           | 7.0.0        | MIT              |
| wrap-ansi                           | 9.0.2        | MIT              |
| ws                                  | 7.5.13       | MIT              |
| ws                                  | 8.22.0       | MIT              |
| xdg-basedir                         | 5.1.0        | MIT              |
| xml-naming                          | 0.3.0        | MIT              |
| y18n                                | 5.0.8        | ISC              |
| yargs                               | 17.7.3       | MIT              |
| yargs                               | 18.2.0       | MIT              |
| yargs-parser                        | 21.1.1       | ISC              |
| yargs-parser                        | 22.0.0       | ISC              |
| zod                                 | 4.6.5        | MIT              |
