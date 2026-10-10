# Documentation comments: dynamic and functional languages

Research checked against primary language and documentation-tool sources on 2026-10-03. These are routing notes for an agent, not a universal formatting specification. Select the repository's language version, documentation generator, lint rules, and existing style before choosing a format. Examples below are original illustrations; they do not assert the history or requirements of an unseen project.

## Contents

- [Shared operating rules](#shared-operating-rules)
- [Python](#python)
- [Ruby](#ruby)
- [PHP](#php)
- [Dart](#dart)
- [Lua](#lua)
- [R](#r)
- [Julia](#julia)
- [Perl](#perl)
- [Elixir](#elixir)
- [Erlang](#erlang)
- [Haskell](#haskell)
- [OCaml](#ocaml)
- [Clojure](#clojure)
- [Godot GDScript](#godot-gdscript)
- [Verification](#verification)

## Shared operating rules

Document the caller's contract at the declaration, then explain each meaningful implementation section where its behaviour or purpose would otherwise require reconstruction. Use a nearby line comment for a consequential expression, boundary, unit conversion, ordering choice, or workaround. Group straightforward lines under one explanation. Include both what happens and why that behaviour matters; avoid narrating assignments or punctuation.

A reason must come from a requirement, test, design record, established invariant, or clearly supported local reasoning. If the reason is unknown, describe the verified behaviour and report the missing intent; never invent an incident or business requirement. Distinguish ordinary comments from executable docstrings, compiler metadata, analyzer annotations, and generator controls. Preserve the latter deliberately. API documentation and implementation explanations serve different readers and normally need different detail.

## Python

Use `#` for implementation comments. A string literal that is the **first statement** of a module, class, function, or method supplies its runtime `__doc__`; a triple-quoted string elsewhere is not a general substitute for a comment. PEP 257 recommends triple double quotes, an imperative summary, and a blank line before extended details. Document applicable arguments, results, exceptions, side effects, and usage constraints. Attribute/additional docstrings are special tool-extracted forms, not ordinary runtime object docstrings. [PEP 257](https://peps.python.org/pep-0257/)

PEP 257 does not choose a markup dialect. Keep the established Sphinx reStructuredText fields (`:param name:`, `:returns:`, `:raises Error:`), Google sections (`Args:`, `Returns:`, `Raises:`), or NumPy underlined sections. Sphinx Napoleon processes Google and NumPy forms. Retain semantic parameter descriptions even when types are already annotations; do not duplicate types unless the configured renderer requires them. [Sphinx Napoleon](https://www.sphinx-doc.org/en/master/usage/extensions/napoleon.html)

```python
def remaining_capacity(used: int, limit: int) -> int:
    """Return the number of additional slots that can be filled.

    Args:
        used: Number of slots currently occupied.
        limit: Maximum number of slots allowed.

    Returns:
        Zero when usage has reached or exceeded the limit.
    """
    # Clamp the result so an overfull queue cannot advertise negative capacity.
    return max(0, limit - used)
```

Preserve shebang/encoding placement and `# type:` / `# type: ignore` controls. Encoding declarations occupy the first or second line, subject to the specified rules. [PEP 263](https://peps.python.org/pep-0263/), [PEP 484](https://peps.python.org/pep-0484/)

## Ruby

Ordinary comments use `#`. Follow the installed RDoc or YARD convention; they are related tools, not one interchangeable tag standard. RDoc extracts declaration comments and supports its own markup/directives; retain visibility controls such as `:nodoc:`. YARD adds structured tags including `@param name [Type]`, `@return [Type]`, and `@raise [Exception]`. Explain yielded values and block expectations when applicable. [RDoc markup](https://ruby.github.io/rdoc/RDoc/Markup.html), [YARD guide](https://rubydoc.info/gems/yard/file/docs/GettingStarted.md)

```ruby
# Returns a cache key with case differences removed.
# @param key [String] A key from the case-insensitive identifier namespace.
# @return [String] A new lowercase key; the input is unchanged.
def cache_key(key)
  # Use the same spelling for equivalent identifiers to prevent duplicate entries.
  key.downcase
end
```

Do not move or change magic comments such as `encoding` and `frozen_string_literal` while improving prose: they affect interpretation and strings. Their position matters. [Ruby comments](https://docs.ruby-lang.org/en/master/syntax/comments_rdoc.html)

## PHP

Attach `/** ... */` DocBlocks to the structural element they document. Use a short summary, optional explanation, then tags such as `@param`, `@return`, and `@throws`. Native types do not replace descriptions of units, array contents, missing values, side effects, or failure conditions. [phpDocumentor syntax](https://docs.phpdoc.org/guide/references/phpdoc/basic-syntax.html)

```php
/**
 * Return the number of additional slots available.
 *
 * @param int $used Number of occupied slots.
 * @param int $limit Maximum allowed occupancy.
 * @return int Zero when occupancy has reached or exceeded the limit.
 */
function remainingCapacity(int $used, int $limit): int
{
    // Clamp overcapacity so callers can use the result as a queue allowance.
    return max(0, $limit - $used);
}
```

Treat analyzer-specific types, generics, assertions, suppressions, and framework annotations as metadata. PHPStan explicitly trusts inline `@var` casts, so an inaccurate annotation can hide an error. Do not add casts to silence analysis or rewrite PHPStan/Psalm syntax into another dialect. [PHPStan PHPDocs](https://phpstan.org/writing-php-code/phpdocs-basics)

## Dart

Prefer `///` before declarations, with Markdown and `[identifier]` references. Dart also supports `/** ... */`, but Effective Dart recommends `///`. Describe parameters, return values, and exceptions in prose rather than importing JavaDoc `@param` tags. Put library documentation before its `library` directive and associated annotations. Keep a short first paragraph. [Effective Dart](https://dart.dev/effective-dart/documentation)

```dart
/// Whether the lease has expired at [now].
///
/// Equality with [expiresAt] counts as expired so adjacent leases cannot overlap.
bool isExpired(DateTime now, DateTime expiresAt) => !now.isBefore(expiresAt);
```

Use `//` for internal explanations. Preserve `@nodoc`, template/macro directives, lint ignores, and other supported controls; a directive may change published documentation. Check actual support in the pinned SDK. [dartdoc directives](https://github.com/dart-lang/dartdoc/blob/main/doc/directives.md), [Dart references](https://dart.dev/tools/doc-comments/references)

## Lua

Lua uses `--` line comments and long comments such as `--[[ ... ]]` or matching `--[=[ ... ]=]`. Long-bracket delimiters must match. [Lua lexical rules](https://www.lua.org/manual/5.4/manual.html#3.1)

For LDoc, use its declaration documentation blocks, commonly an opening `---`, followed by `-- @param`, `-- @return`, or typed `@tparam` / `@treturn` tags. LuaLS annotations instead use forms such as `---@param name type description` and influence language-server analysis. Do not assume these dialects have identical parsing or type semantics. [LDoc](https://lunarmodules.github.io/ldoc/manual/manual.md.html), [LuaLS](https://luals.github.io/wiki/annotations/)

```lua
--- Build a key for a case-insensitive cache.
-- @tparam string key Identifier to normalize.
-- @treturn string Lowercase key; the supplied string is unchanged.
function cache_key(key)
    -- Merge spelling differences so equivalent identifiers share one entry.
    return string.lower(key)
end
```

## R

Use `#` internally and roxygen2 `#'` blocks directly before documented objects. Typical tags include `@param`, `@returns`, `@details`, and `@examples`. Preserve the project's Markdown setting. Roxygen can generate `.Rd` documentation; edit its source comments rather than hand-editing generated output. [roxygen2 introduction](https://roxygen2.r-lib.org/articles/roxygen2.html)

```r
#' Remove negative allowances
#'
#' @param allowance Numeric vector of available amounts.
#' @returns A numeric vector with negative values replaced by zero.
#'   Missing values remain missing.
nonnegative_allowance <- function(allowance) {
  # Preserve vector positions so results still match their original accounts.
  pmax(allowance, 0)
}
```

`@export`, imports, S3 registrations, and namespace directives can change package behaviour through generated `NAMESPACE`; they are not cosmetic text. Preserve intended exports and imports. Review generated changes. Examples may run during package checks; use safe, reproducible data. [roxygen2 namespaces](https://roxygen2.r-lib.org/articles/namespace.html)

## Julia

Place a docstring immediately before the documented object, with no intervening blank line or comment. Julia uses Markdown and conventionally starts with an indented signature followed by a short imperative summary. Unlike Python, a signature in the docstring is recommended. Ordinary comments use `#`; block comments use `#= ... =#`. Document generic behaviour once and explain method-specific differences where necessary. [Julia documentation](https://docs.julialang.org/en/v1/manual/documentation/)

```julia
"""
    remaining_capacity(used, limit)

Return the additional capacity, or zero if usage meets or exceeds the limit.
"""
function remaining_capacity(used, limit)
    # Keep overcapacity from becoming a negative allowance for the next batch.
    return max(0, limit - used)
end
```

`@doc` associates documentation metadata; docstrings still process interpolation and escapes. Use the documented `@doc raw"""..."""` form when literal syntax requires it. `jldoctest` blocks are executable under Documenter; ordinary Julia fences do not automatically make examples tests. [Julia `@doc`](https://docs.julialang.org/en/v1/base/base/), [Documenter doctests](https://documenter.juliadocs.org/stable/man/doctests/)

## Perl

Use `#` for implementation comments and POD for published documentation. POD commands such as `=head1`, `=head2`, and `=cut` begin at the line start; paragraphs and blank lines carry meaning. End an in-source POD block with `=cut` before resuming code. Use `C<...>` for code and `L<...>` for links. [perlpod](https://perldoc.perl.org/perlpod)

```perl
=head2 remaining_capacity

Return additional capacity. Full and overfull queues both return zero.

=cut

sub remaining_capacity {
    my ($used, $limit) = @_;
    # Give callers an allowance they can use without handling negative sizes.
    return $used < $limit ? $limit - $used : 0;
}
```

Preserve POD encoding declarations and data/end markers. Do not turn live code into a POD block accidentally.

## Elixir

Use `@moduledoc`, `@doc`, and `@typedoc` for module, function, and type documentation. These are module attributes, not `#` comments. Documentation uses Markdown; `@doc` belongs before its function. Keep `@spec` truthful and separate from explanation. Describe return tuples, failures, process behaviour, and side effects where relevant. [Elixir documentation](https://elixir.hexdocs.pm/writing-documentation.html)

```elixir
@doc """
Returns additional capacity, with full and overfull queues both returning zero.
"""
@spec remaining_capacity(non_neg_integer(), non_neg_integer()) :: non_neg_integer()
def remaining_capacity(used, limit) do
  # Prevent the next batch from receiving a negative allowance.
  max(0, limit - used)
end
```

Preserve deliberate `@doc false`, metadata, and deprecations. `iex>` examples can become ExUnit doctests when the test module uses `doctest`; they are not automatically executed by existing prose alone. [ExUnit.DocTest](https://ex-unit.hexdocs.pm/ExUnit.DocTest.html)

## Erlang

Version matters. OTP 27 introduced native `-moduledoc` and `-doc` attributes. `-moduledoc` precedes the first function or `-doc`; `-doc` precedes its function, type, or callback. The default documentation format is Markdown. Keep `-spec` declarations as types/contracts. [Erlang documentation](https://www.erlang.org/doc/system/documentation.html)

```erlang
-doc "Returns zero once occupancy has reached the queue limit.".
-spec remaining_capacity(non_neg_integer(), non_neg_integer()) -> non_neg_integer().
remaining_capacity(Used, Limit) ->
    % Avoid passing a negative allowance to the next batch.
    max(0, Limit - Used).
```

Older or established EDoc projects use comments such as `%% @doc ...`, with tags associated with the next significant construct. EDoc has its own markup and tags; do not convert to native attributes without checking the target OTP and build tooling. [EDoc](https://www.erlang.org/doc/apps/edoc/chapter.html)

## Haskell

Use Haddock `-- |` before a declaration or `-- ^` after the item being documented; `{-| ... -}` is a block form. Use ordinary `--` for implementation notes. Explain laziness/strictness, partiality, effects, input assumptions, and meaningful typeclass laws when applicable. [Haddock markup](https://haskell-haddock.readthedocs.io/latest/markup.html)

```haskell
-- | Return additional capacity, clamped at zero for full or overfull queues.
remainingCapacity :: Integer -> Integer -> Integer
remainingCapacity used limit =
  -- Keep an overfull queue from requesting a negative batch size.
  max 0 (limit - used)
```

Do not confuse comments with `{-# LANGUAGE ... #-}`, `{-# OPTIONS_GHC ... #-}`, or other pragmas. Preserve literate `.lhs` layout and documentation examples that existing tooling executes.

## OCaml

Use `(** ... *)` for documentation and `(* ... *)` for implementation explanations. Prefer the public `.mli` contract where one exists. Odoc markup includes `[code]`, `{!reference}`, and tags such as `@param`, `@return`, and `@raise`; it is not Markdown. Place docs immediately before or after the intended item and use separation to avoid accidentally attaching them to both neighbours. [odoc authors](https://ocaml.github.io/odoc/odoc/odoc_for_authors.html)

```ocaml
val remaining_capacity : int -> int -> int
(** [remaining_capacity used limit] returns additional capacity.
    Full and overfull queues return zero so callers receive a valid allowance. *)
```

The compiler converts documentation comments into attributes. Ambiguous placement can produce warning 50. Preserve stop comments and other generator controls. [OCaml documentation comments](https://ocaml.org/manual/5.4/doccomments.html)

## Clojure

Use semicolon comments for implementation explanations, matching local semicolon conventions. A `defn` docstring appears after its name and before the argument vector; it becomes Var metadata. Keep the established renderer, such as Codox, and document argument meaning, laziness, realization, exceptions, and effects in prose. [Clojure `defn`](https://clojure.github.io/clojure/clojure.core-api.html#clojure.core/defn), [Codox](https://github.com/weavejester/codox)

```clojure
(defn remaining-capacity
  "Returns additional capacity, or zero for full and overfull queues."
  [used limit]
  ;; Keep overcapacity from becoming a negative allowance for the next batch.
  (max 0 (- limit used)))
```

`#_` removes the next reader form; `(comment ...)` is a macro yielding nil. Neither is ordinary documentation syntax. Preserve metadata/type hints and reader conditionals. [Clojure reader](https://clojure.org/reference/reader)

## Godot GDScript

Use `##` documentation before members or their annotations; use `#` internally. Put script-level documentation before member documentation. Godot supports BBCode-like class-reference markup such as `[param name]`, `[method name]`, `[member name]`, and `[code]...[/code]`, not generic Markdown. Documented exported variables provide editor tooltips. [GDScript documentation](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_documentation_comments.html)

```gdscript
## Return available slots, with overfull queues receiving no new work.
func remaining_capacity(used: int, limit: int) -> int:
    # Clamp the allowance so the scheduler cannot request a negative batch.
    return maxi(0, limit - used)
```

Preserve real annotations such as `@export` and `@warning_ignore`. Documentation tags such as `@deprecated` describe API status and must have evidence. Match the project's Godot version and inspect editor help or generated XML.

## Verification

Use the repository's existing environments and scripts. These are candidate commands **only when the matching tool is already installed and configured**: the repository's configured Sphinx build; `bundle exec yard` / the RDoc task; the configured phpDocumentor and PHPStan/Psalm commands; `dart analyze` and `dart doc`; the existing LDoc command; the package's roxygen generation and R check; Julia's `docs/make.jl`; `podchecker`; `mix docs` and existing doctests; configured Erlang EDoc/ExDoc tasks; Cabal/Stack's Haddock task; `dune build @doc`; the existing Codox task; and Godot's configured documentation export. Do not install tools merely to check prose.

Inspect generated output and metadata diffs, especially links, attachment, parameter names, code fences, exported symbols, and namespace changes. Run relevant existing tests when documentation carries executable examples, type/analyzer metadata, or compiler effects. Report skipped tools honestly. A successful build checks syntax and wiring, not the truth of the explanation.

Documentation generation can execute code: Sphinx autodoc imports modules, and doctest/example runners execute examples. Use the repository's safe fixtures and documented environment. [Sphinx autodoc](https://www.sphinx-doc.org/en/master/usage/extensions/autodoc.html)
