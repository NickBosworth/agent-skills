# Web languages, templates and structured files

Research reference, checked 3 October 2026. Recommendations below are a synthesis; linked sources establish syntax and tool behavior. Examples are original and describe deliberately chosen behavior, not facts inferred about an existing application.

## Contents

1. Choose the actual language and documentation consumer
2. JavaScript and TypeScript
3. Browser languages and component files
4. Server and document templates
5. Structured data and API definitions
6. Strict JSON: an adjacent documentation example
7. Directives, generators and verification

## 1. Choose the actual language and documentation consumer

Inspect the repository before selecting notation: file contents, language version, embedded blocks, package manifests, documentation configuration, formatters, and nearby maintained examples. A `.json` extension does not establish whether a particular consumer accepts JSONC. A `.vue` file can contain HTML, TypeScript, SCSS, and a project-specific documentation block. A YAML scalar may contain a shell program rather than YAML comments.

Use ordinary comments for the implementation's purpose and decisions; use the configured documentation syntax for contracts. Explain each meaningful section's work and the reason for its arrangement. Place a line comment on an individual operation when its constraint or consequence needs explaining. Avoid mechanically translating operators and identifiers into English. A comment must not claim a business rationale, guarantee, or past incident that the code and available evidence cannot establish.

Treat comments as source input. Some control checking, emitted code, formatting, public documentation, or output whitespace. Never assume that inserting, moving, or deleting comments is behavior-neutral.

## 2. JavaScript and TypeScript

| Context | Professional form and documentation contract |
| --- | --- |
| JavaScript implementation | `// Explanation.` or `/* Explanation. */`; block comments do not nest. Use preceding section comments for stages, and precise local comments for ordering, validation, mutation, cleanup, cancellation, or unusual algorithms. |
| JSDoc | Put `/** ... */` immediately before the declaration. Start with a short purpose sentence. Use actual supported tags such as `@param {Type} name - meaning`, `@returns {Type}`, `@throws {Error}`, `@example`, and `@deprecated` when applicable. Ordinary `/*` and decorative `/***` are not JSDoc blocks. [JSDoc documentation](https://jsdoc.app/about-getting-started). |
| JavaScript checked by TypeScript | Preserve `@type`, `@param`, `@returns`, `@typedef`, `@template`, import types, `@satisfies`, access modifiers, and similar annotations as type-system inputs. Editing them can introduce or hide type errors. Some TypeScript-supported JSDoc forms extend standard JSDoc, so verify every consuming tool. [TypeScript JSDoc reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html). |
| TypeScript with TSDoc | Use `/** ... */`, a summary, optional `@remarks`, `@param name - meaning`, `@typeParam T - meaning`, `@returns`, `@throws`, `@example`, `@deprecated`, and `{@link Symbol}` according to the configured tool. Types belong in TypeScript declarations; describe meaning, units, ranges, and ownership in prose. [TSDoc approach and tag reference](https://tsdoc.org/pages/intro/approach/). |
| TypeDoc projects | TypeDoc extracts TSDoc/JSDoc-style tags with its own parser and Markdown renderer. Do not promise universal TSDoc compliance. Respect configured tags and discovery rules. Use fenced examples; indentation-only examples do not protect tags from TypeDoc's parser. Escape a literal closing comment delimiter as required by the tool. [TypeDoc comments](https://typedoc.org/documents/Doc_Comments.html). |

For contracts, explain whether input is changed, whether returned objects are shared, what order is guaranteed, and how absent or invalid values behave. For asynchronous APIs, distinguish synchronous throws from promise rejection; describe abort handling, race prevention, and resource ownership when relevant. Do not duplicate a full interface contract on every implementation; preserve links or supported inheritance mechanisms, and explain implementation-specific differences locally.

### Original JavaScript example: stable conflict resolution

```js
/**
 * A record whose revision increases when its contents change.
 * @typedef {object} RecordRevision
 * @property {string} id - Stable identity of the record.
 * @property {number} revision - Finite revision, validated by the caller.
 */

/**
 * Keeps the newest revision of each record without changing the input.
 * Equal revisions keep the first record encountered.
 *
 * @param {RecordRevision[]} records - Records to reconcile.
 * @returns {Map<string, RecordRevision>} Records keyed by ID. Values are
 * the original objects; changing one also changes the input object.
 */
export function indexNewest(records) {
  /** @type {Map<string, RecordRevision>} */
  const newest = new Map();

  // Resolve each ID separately so an update cannot replace a different record.
  for (const record of records) {
    const current = newest.get(record.id);

    // Replace only older revisions. Keeping the first equal revision makes
    // the result deterministic when the same version appears more than once.
    if (current === undefined || record.revision > current.revision) {
      newest.set(record.id, record);
    }
  }

  return newest;
}
```

The typedef and map annotation affect checking; the implementation comments explain the conflict policy. In an existing codebase, verify that policy before documenting it as intended behavior.

### Original TypeScript example: contract plus section rationale

```ts
/**
 * Splits items into batches while preserving their order.
 *
 * @typeParam T - The type of item carried into each batch.
 * @param items - Items to group; the input array is not changed.
 * @param maxItems - Largest permitted batch size, as a positive safe integer.
 * @returns New batch arrays. Their elements are shared with the input.
 * An empty input produces no batches.
 * @throws RangeError if maxItems is not a positive safe integer.
 */
export function splitBatches<T>(items: readonly T[], maxItems: number): T[][] {
  // Reject invalid sizes before looping; zero would prevent forward progress.
  if (!Number.isSafeInteger(maxItems) || maxItems <= 0) {
    throw new RangeError("maxItems must be a positive safe integer");
  }

  // Copy consecutive slices so callers can rearrange a batch without
  // changing the input array. Slice also handles the shorter final batch.
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += maxItems) {
    batches.push(items.slice(start, start + maxItems));
  }

  return batches;
}
```

## 3. Browser languages and component files

| Language or region | Form, useful content, and boundaries |
| --- | --- |
| JSX / TSX children | `{/* Explanation. */}`. Use JavaScript comments in JavaScript regions. Plain `//` in JSX text is not a JavaScript comment. A JSX comment is an expression container, not an HTML comment. [Official Prettier JSX example](https://prettier.io/docs/ignore#jsx). |
| HTML | `<!-- Explanation. -->` outside tags; no nesting. Respect HTML's delimiter restrictions. Inside `script` and `style`, use the embedded language. Explain semantic structure, accessibility decisions, compatibility constraints, and intentional ordering. Comments may remain in delivered source and the DOM. [HTML syntax](https://html.spec.whatwg.org/multipage/syntax.html#comments). |
| CSS | `/* Explanation. */`; no `//` syntax and no nesting. Explain cascade order, specificity constraints, layout invariants, fallbacks, and why a value exists. Place comments between complete syntactic units, not within identifiers, strings, or URLs. [CSS tokenizer](https://www.w3.org/TR/css-syntax-3/#consume-comments). |
| SCSS / Sass | SCSS supports `//` and `/* ... */`. Silent `//` comments are not emitted; block comments may be emitted and can evaluate interpolation. `/*! ... */` can survive compressed output. Indented `.sass` comments cover indented following lines, so indentation changes their extent. [Sass comments](https://sass-lang.com/documentation/syntax/comments/). |
| SassDoc | `///` immediately above variables, mixins, functions, or placeholders; documented annotations include `@param`, `@return`, `@output`, `@content`, and `@example`. Use only when SassDoc is the consumer; plain CSS does not gain this syntax. [SassDoc annotations](https://sassdoc.com/annotations/). |
| Less | `//` or `/* ... */`. Explain design tokens, mixin contracts, and output effects; inspect the build's comment preservation. [Less syntax](https://lesscss.org/#overview-comments). |
| Vue | Top-level and ordinary template comments use HTML syntax. Inside each block use its actual language, including its `lang` attribute. Custom `<docs>` blocks need supporting tooling; do not invent them. [Vue SFC specification](https://vuejs.org/api/sfc-spec.html#comments). |
| Svelte | Use HTML comments in markup and the matching language in scripts/styles. A markup comment beginning `@component` provides component hover documentation. `svelte-ignore` suppresses warnings for the next markup block and must retain its exact scope. [Svelte markup](https://svelte.dev/docs/svelte/basic-markup#Comments). |
| Astro | Template regions support HTML comments and `{/* ... */}`. HTML comments enter the browser DOM; JavaScript-style template comments are skipped. Frontmatter uses JavaScript/TypeScript comment syntax. [Astro syntax](https://docs.astro.build/en/reference/astro-syntax/#comments). |

Never put credentials or sensitive internal notes into comments. Removal from a rendered page does not guarantee removal from bundles, source maps, generated documentation, or repository history. Check output when confidentiality or public visibility matters. Comment insertion between inline elements can also introduce visible whitespace; compare rendered output when editing those boundaries.

## 4. Server and document templates

Use the template engine's comment when the explanation belongs to the template author. HTML comments can still contain template expressions that execute before the browser sees the output.

| Engine | Native form and distinction |
| --- | --- |
| Jinja | `{# ... #}`, including multiline content; delimiters are configurable. `{#- ... -#}` additionally trims surrounding whitespace. Preserve existing trim behavior. [Jinja comments and whitespace](https://jinja.palletsprojects.com/en/stable/templates/#comments). |
| Django templates | `{# ... #}` is single-line; `{% comment %} ... {% endcomment %}` handles multiple lines. [Django syntax](https://docs.djangoproject.com/en/5.2/ref/templates/language/#comments). |
| Handlebars | `{{! ... }}`; use `{{!-- ... --}}` when the comment includes Handlebars tokens. These are omitted from output; HTML comments are emitted. [Handlebars](https://handlebarsjs.com/guide/#template-comments). |
| EJS | `<%# ... %>` is neither executed nor output. Configured delimiters and closing tags such as `-%>` can change parsing or whitespace. [EJS tags](https://ejs.co/#docs). |
| Liquid | `{% comment %} ... {% endcomment %}`; current syntax also supports `{% # ... %}` with a `#` on every comment line. Check the installed engine version and whitespace controls. [Liquid](https://shopify.github.io/liquid/tags/template/#comment). |
| Razor | `@* ... *@` is removed by the server. C# regions support C# comments; HTML comments remain in rendered HTML. [Razor](https://learn.microsoft.com/en-us/aspnet/core/mvc/views/razor#comments). |
| Markdown / MDX | CommonMark accepts HTML comments, which can also affect block separation. MDX uses `{/* ... */}` instead. Explain examples in visible prose when readers need that information. [CommonMark](https://spec.commonmark.org/0.31.2/), [MDX](https://mdxjs.com/docs/what-is-mdx/). |

## 5. Structured data and API definitions

| Format | Comment support and documentation destination |
| --- | --- |
| Strict JSON | No comments. Do not add `_comment`, `$comment`, or `description` keys to arbitrary payloads as substitutes. Use existing adjacent documentation or a separately supported schema. [RFC 8259 grammar](https://www.rfc-editor.org/rfc/rfc8259#section-2). |
| JSONC | `//` and non-nesting `/* ... */` where whitespace is allowed. Trailing comma support varies by parser; comment support does not imply it. Confirm the consuming application. [JSONC specification](https://jsonc.org/). |
| JSON5 | `//` and non-nesting `/* ... */`. Its additional syntax does not make it interchangeable with strict JSON. [JSON5 specification](https://spec.json5.org/#comments). |
| JSON Schema | `title` and `description` document data for consumers. `$comment`, available from draft 7, is for schema maintainers and may be discarded. Put these only in actual schema locations allowed by the selected dialect. [Annotations](https://json-schema.org/understanding-json-schema/reference/annotations), [comments](https://json-schema.org/understanding-json-schema/reference/comments). |
| YAML | `#` outside scalar content; separate from preceding tokens with whitespace. Inside a quoted or block scalar, apparent comments can be data or embedded-language text. Describe units, operational constraints, ordering, and environment differences. Do not change scalar indentation or folding. [YAML 1.2.2](https://yaml.org/spec/1.2.2/#66-comments). |
| TOML | `#` to line end outside strings. No block-comment delimiter. Explain settings immediately above their key or table. [TOML](https://toml.io/en/v1.0.0#comment). |
| INI | Dialect-specific. Determine whether `;`, `#`, and inline comments are accepted. For example, Python's ConfigParser defaults allow whole-line `#` and `;` but disable inline comments. [ConfigParser](https://docs.python.org/3/library/configparser.html#customizing-parser-behaviour). |
| XML / SVG | `<!-- ... -->` outside other markup; never insert into a tag or attribute value. XML comments cannot contain `--` or end with a hyphen immediately before the closing delimiter. CDATA is data, not a comment. [XML specification](https://www.w3.org/TR/xml/#sec-comments). |
| XSD | XML comments for local implementation notes; `xs:annotation` containing `xs:documentation` for human-facing schema documentation. `xs:appinfo` is for application information. Respect the schema's namespace and allowed placement. [XSD annotations](https://www.w3.org/TR/xmlschema11-1/#cAnnotations). |
| GraphQL | `#` comments are ignored. Quoted descriptions, often `"""..."""`, directly precede documented definitions and are available through schema introspection. They are documentation strings, not block comments. Verify version and location support. [GraphQL descriptions](https://spec.graphql.org/September2025/#sec-Descriptions). |
| Protocol Buffers | Prefer `//` immediately before the element; `/* ... */` also works. Document units, defaults, presence, compatibility decisions, and reserved fields. Generated documentation depends on the language generator/plugin. [Protobuf guide](https://protobuf.dev/programming-guides/proto3/#adding-comments). |
| OpenAPI | In YAML, `#` is an ordinary comment; JSON has none. Use supported `summary`, `description`, and `externalDocs` fields at their valid locations. Descriptions support CommonMark; renderers may restrict features. Honor the file's OpenAPI version. [OpenAPI](https://spec.openapis.org/oas/v3.2.0.html#rich-text-formatting). |
| Jupyter notebooks | `.ipynb` is JSON; document intent in Markdown cells and implementation in code cells using the kernel language. Preserve cell IDs, metadata, outputs, and execution state unless the requested edit needs a change. [Notebook format](https://nbformat.readthedocs.io/en/latest/format_description.html). |

## 6. Strict JSON: an adjacent documentation example

Given an existing strict `worker.json`:

```json
{
  "retry": {
    "maxAttempts": 4,
    "delayMs": 250
  }
}
```

Keep the payload unchanged. Extend its existing configuration reference, or create `worker.json.md` when no suitable reference exists:

| JSON Pointer | Meaning and reason |
| --- | --- |
| `/retry/maxAttempts` | Maximum calls including the first attempt. Four limits repeated work during an outage. |
| `/retry/delayMs` | Milliseconds between failed calls. The delay gives a briefly unavailable worker time to recover. |

These are illustrative meanings; establish them from implementation or requirements before writing them for a real file. Link the adjacent reference from an existing README when discoverability needs improvement. Prefer stable property paths over line numbers. Do not silently migrate the consumer to JSONC or add unrecognized fields just to achieve inline comments.

## 7. Directives, generators and verification

Preserve exact directive text, attachment, and scope: TypeScript checking controls and triple-slash references; ESLint and formatter controls; coverage exclusions; source-map markers; bundler purity annotations; framework suppressions; license headers. A justified new suppression must name the relevant rule, explain why the exception is needed, and remain as narrow as possible.

[TypeScript triple-slash directives](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) must precede declarations. [`@ts-expect-error`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#ts-expect-error-comments) suppresses an error and fails when unnecessary. [ESLint](https://eslint.org/docs/latest/use/configure/rules#comment-descriptions) supports explanations after `--`; [Prettier](https://prettier.io/docs/ignore) attaches ignores to particular syntax. [esbuild](https://esbuild.github.io/api/#pure) purity comments permit removal of unused calls; its legal-comment rules can preserve selected comments in emitted files. These are operational inputs, not interchangeable prose.

Do not hand-edit generated clients, bundles, lockfiles, or checked-in derived documentation as the lasting fix. Find the maintained schema, template, or source declaration and use the existing regeneration workflow. Check the generated result for lost comments and accidental publication of internal rationale.

Verify edited files with their actual parser and configured documentation tooling. Use existing type checks when JSDoc changes, and render or compile affected templates. [ECMAScript](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-comments) treats a multiline comment containing a line terminator as a line terminator for parsing, so placement can change automatic semicolon insertion. Comparing token text after stripping comments is not a universal proof of equivalence. Finish with a human-style read of the diff: accurate intent, complete meaningful-section coverage, valid links and tags, preserved directives, and no invented history.
