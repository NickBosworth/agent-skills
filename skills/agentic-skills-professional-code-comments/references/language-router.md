# Language and file routing

## Contents

- [Identify the consumer](#identify-the-consumer)
- [Language profiles](#language-profiles)
- [Markup, configuration, and data](#markup-configuration-and-data)
- [Unknown and mixed formats](#unknown-and-mixed-formats)

## Identify the consumer

Extensions are hints. Verify the actual compiler, interpreter, parser, documentation generator, language version, and embedded regions from project configuration. All links below are relative to this reference directory. Keep the full skill folder together.

Distinguish five layers: ordinary source comments, extracted API documentation, operational directives/type metadata, schema-supported description fields, and adjacent documentation for formats without comments. A shared delimiter does not make their semantics interchangeable.

## Language profiles

| Languages or files | Documentation system / important distinction | Profile |
| --- | --- | --- |
| C# `.cs`; VB.NET `.vb`; F# `.fs`, `.fsi`, `.fsx` | XML documentation; language-specific tags, attachment, inheritance, and compiler diagnostics | [dotnet-jvm.md](dotnet-jvm.md) |
| Java `.java` | Javadoc; traditional `/** */`, version-sensitive Markdown documentation | [dotnet-jvm.md](dotnet-jvm.md) |
| Kotlin `.kt`, `.kts`; Scala `.scala`; Groovy `.groovy`, `.gradle` | KDoc/Dokka, Scaladoc, Groovydoc; distinct tags and markup | [dotnet-jvm.md](dotnet-jvm.md) |
| C/C++ `.c`, `.cc`, `.cpp`, `.cxx`, `.h`, `.hpp` | Doxygen or project's alternative such as kernel-doc; compiler and preprocessor rules remain separate | [systems.md](systems.md) |
| Rust `.rs` | rustdoc attributes, links, safety documentation, executable examples | [systems.md](systems.md) |
| Go `.go` | Go doc comments, example tests, build/compiler/cgo directives | [systems.md](systems.md) |
| Swift `.swift`; Objective-C `.m`, `.mm`, `.h` | DocC/Clang documentation; ownership, actor isolation, bridging | [systems.md](systems.md) |
| Zig `.zig`; assembly `.s`, `.S`, `.asm`; Fortran `.f`, `.f90` and relatives | Zig docs, assembler-specific delimiters, FORD/kernel or project tooling | [systems.md](systems.md) |
| GLSL `.glsl`, `.vert`, `.frag`, `.comp`; WGSL `.wgsl` | Different nesting/preprocessing rules; host/shader contracts | [systems.md](systems.md) |
| Python `.py`, `.pyi` | PEP 257 plus selected Sphinx/Google/NumPy dialect; runtime docstrings | [dynamic-functional.md](dynamic-functional.md) |
| Ruby `.rb`, `.rake`; PHP `.php` | RDoc/YARD and PHPDoc; type/framework metadata and magic comments | [dynamic-functional.md](dynamic-functional.md) |
| Dart `.dart`; Lua `.lua` | dartdoc; LDoc versus LuaLS annotations | [dynamic-functional.md](dynamic-functional.md) |
| R `.R`, `.r`; Julia `.jl`; Perl `.pl`, `.pm` | roxygen2, Julia/Documenter, POD; generator and runtime implications | [dynamic-functional.md](dynamic-functional.md) |
| Elixir `.ex`, `.exs`; Erlang `.erl`, `.hrl` | ExDoc/module attributes; native Erlang docs versus EDoc by version | [dynamic-functional.md](dynamic-functional.md) |
| Haskell `.hs`, `.lhs`; OCaml `.ml`, `.mli`; Clojure `.clj`, `.cljs`, `.cljc` | Haddock, odoc, docstring metadata/Codox; preserve pragmas/readers | [dynamic-functional.md](dynamic-functional.md) |
| GDScript `.gd` | Godot `##` docs and editor-specific markup | [dynamic-functional.md](dynamic-functional.md) |
| JavaScript `.js`, `.mjs`, `.cjs`; TypeScript `.ts`, `.mts`, `.cts` | JSDoc, TypeScript JSDoc, TSDoc, TypeDoc are distinct consumers | [web-formats.md](web-formats.md) |
| JSX `.jsx`, TSX `.tsx`; Vue `.vue`, Svelte `.svelte`, Astro `.astro` | Component/host markup plus embedded language docs and directives | [web-formats.md](web-formats.md) |
| Shell `.sh`, `.bash`, `.zsh`; PowerShell `.ps1`, `.psm1`, `.psd1`; batch `.bat`, `.cmd` | Shell grammar, comment-based help, global requirements, interpreter-specific rules | [operations-data.md](operations-data.md) |
| SQL `.sql` | Actual database dialect and migration runner; comments versus hints/executable comments/metadata writes | [operations-data.md](operations-data.md) |
| MATLAB/Octave `.m`; Solidity `.sol`; Vyper `.vy`; D `.d`; Ada `.ads`, `.adb`; Pascal `.pas`; COBOL `.cob`, `.cbl` | Native help, NatSpec, Ddoc, GNATdoc, XMLDoc, source-form rules as verified | [additional-languages.md](additional-languages.md) |
| HLSL `.hlsl`; Metal `.metal`; TeX `.tex`; BibTeX `.bib`; Fish `.fish`; Nushell `.nu` | Compiler/processor-specific constraints and documentation fallback | [additional-languages.md](additional-languages.md) |

## Markup, configuration, and data

| Files or contexts | Route and required treatment |
| --- | --- |
| HTML, XML, SVG, XSD | [web-formats.md](web-formats.md): legal comment placement, delimiter restrictions, XSD documentation nodes, public visibility. |
| CSS, SCSS, Sass, Less | [web-formats.md](web-formats.md): ordinary CSS has no line comments; preprocessors and SassDoc have their own forms. |
| Razor/Blazor `.cshtml`, `.razor`; Jinja, Django, Liquid, EJS, Handlebars templates | [web-formats.md](web-formats.md): native template comments, embedded code, whitespace, and server/client visibility. |
| JSON, JSONC, JSON5 | [web-formats.md](web-formats.md): preserve actual parser; strict JSON permits no comment tokens. |
| YAML, TOML, INI, `.env`, `.conf` | [web-formats.md](web-formats.md) for grammar; [operations-data.md](operations-data.md) for consumer/operational rules. Never assume all INI or dotenv consumers agree. |
| OpenAPI, JSON Schema, GraphQL SDL, `.proto` | [web-formats.md](web-formats.md): use supported descriptions and actual extraction plugins; preserve schema semantics and exposure. |
| Dockerfile, Compose, Terraform/HCL, Kubernetes/Ansible/CI YAML, Nix, CUE, Makefile, CMake | [operations-data.md](operations-data.md): parser directives, embedded commands, significant whitespace, and safe local checks. |
| MSBuild `.csproj`, `.props`, `.targets`; Ant/Maven XML | XML syntax from [web-formats.md](web-formats.md), build effects from the actual consumer. Explain target ordering/property conditions where evidenced. |
| Markdown, MDX, reStructuredText, notebooks | [web-formats.md](web-formats.md); for RST use the actual Sphinx parser. Prefer visible prose for reader explanations and kernel-specific comments inside code cells. |
| CSV, TSV, JSON Lines, JSONL/NDJSON | [operations-data.md](operations-data.md). No universal comment rows; JSON Lines consists of JSON values, not comments. Document fields/units/null conventions alongside, using an existing data dictionary/schema. |
| Binary images/media, archives, fonts, compiled assets, `.mlx` live scripts | No source-comment insertion. Explain source, transform, and use in maintained text or application-native documentation, respecting the actual format. |
| Lockfiles, minified bundles, source maps, snapshots, generated clients/docs, third-party/vendor files | Preserve generated or external ownership. Review the maintained template/schema/source and established regeneration workflow. Do not decorate derived output. |
| Regex, embedded SQL, shell snippets, shader strings | Explain through the host language's comments unless the embedded parser explicitly supports a comment mode already in use. Turning on extended/free-spacing regex mode changes parsing and requires a behavioural decision. |

## Unknown and mixed formats

For any unlisted language or extension:

1. Identify the consuming parser, dialect, version, and whether the file is generated or embedded.
2. Inspect current maintained examples and official syntax/documentation guidance.
3. Establish legal comment delimiters, placement, nesting, header/whitespace rules, and doc extraction format.
4. Identify directive comments, attributes, executable examples, and schema metadata that carry operational meaning.
5. Apply the shared quality standard using that format, or adjacent documentation if comments are unsupported.
6. Verify with the existing parser/docs workflow and record unavailable checks.

Treat `.m` (MATLAB/Octave or Objective-C), `.h` (several native languages), `.pl` (Perl or Prolog), `.inc`, `.s`, `.conf`, and extensionless scripts as uncertain until inspected. Do not paste one language's delimiter into another or assume that a block containing `#` is a comment rather than data.
