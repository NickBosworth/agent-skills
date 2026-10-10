# .NET and JVM commenting reference

Research reviewed: 3 October 2026. Select syntax using the repository's language, compiler, IDE, and documentation-generator versions. Examples are original; their stated contracts must not be copied onto unrelated implementations.

## Contents

- [Working standard](#working-standard)
- [C#](#c)
- [Visual Basic .NET](#visual-basic-net)
- [F#](#f)
- [Java](#java)
- [Kotlin](#kotlin)
- [Scala](#scala)
- [Groovy](#groovy)
- [Contracts, controls, and validation](#contracts-controls-and-validation)

## Working standard

Use declaration documentation for the caller's contract. Use nearby ordinary comments to explain each meaningful implementation section: what it accomplishes and why that step, ordering, boundary, or rule matters. Add a line comment when one line contains a decision that a section comment cannot explain precisely. Keep the explanation adjacent when code moves.

Write short sentences with familiar words. Explain units, defaults, sentinel values, ownership, side effects, and failure conditions instead of repeating types. A useful pattern is “Do X so Y remains true.” Establish Y from requirements, tests, code, or a recorded decision; do not invent historical motivation. Avoid empty summaries, decorative banners, and invented author/version tags. Scala's official style guidance similarly prioritizes useful substance and progressively deeper detail over formatting. [Scala style guide](https://docs.scala-lang.org/style/scaladoc.html)

## C#

### Syntax and placement

Use `// Text.` for implementation comments, normally on their own line with one space after the delimiter. Put `///` XML documentation immediately before a declaration, **before its attributes**. C# also recognizes `/** ... */` documentation, but follow the project's established style. These forms are distinct from ordinary `/* ... */` comments. [C# comment style](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions) · [Documentation specification](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/documentation-comments)

### Documentation vocabulary

| Need | XML form |
|---|---|
| Concise purpose | `<summary>...</summary>` |
| Contract details and rationale | `<remarks><para>...</para></remarks>` |
| Inputs and generic parameters | `<param name="id">...</param>`, `<typeparam name="T">...</typeparam>` |
| Returned result or property value | `<returns>...</returns>`, `<value>...</value>` |
| Failure condition | `<exception cref="ArgumentException">Condition.</exception>` |
| Parameter references | `<paramref name="id"/>`, `<typeparamref name="T"/>` |
| Symbol and keyword references | `<see cref="SomeType"/>`, `<see langword="null"/>` |
| Related API and examples | `<seealso cref="SomeType"/>`, `<example><code>...</code></example>` |
| Inline code | `<c>...</c>` |

Use tags applicable to the declaration. An empty tag is not documentation. Describe when an exception occurs; naming its type is insufficient. Parameter names must match the signature. The compiler checks selected tags and references, but that does not prove the prose correct. [Recommended XML tags](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/recommended-tags)

### Escaping and references

XML must be well formed. Escape literal `&` as `&amp;` and `<` as `&lt;`; use `&gt;` for displayed `>`, and escape attribute quotes when needed. `<code>` does not disable XML parsing. Use CDATA only where supported and never include its closing sequence inside it. In C# `cref`, generic references can use braces, for example `IReadOnlyList{T}`, rather than raw angle brackets. Prefer compiler-resolved references to guessed member-ID strings. [C# documentation specification](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/documentation-comments)

```csharp
/// <summary>Returns the final item, using a fallback when the list is empty.</summary>
/// <typeparam name="T">The item type.</typeparam>
/// <param name="items">The list to read; must not be null.</param>
/// <param name="fallback">The value to use for an empty list.</param>
/// <returns>The final item, or <paramref name="fallback"/>.</returns>
/// <exception cref="ArgumentNullException">
/// <paramref name="items"/> is <see langword="null"/>.
/// </exception>
/// <remarks>The returned <typeparamref name="T"/> is not cloned.</remarks>
public static T LastOr<T>(IReadOnlyList<T> items, T fallback)
{
    // Reject a missing list before reading its size, so the error names the input.
    if (items is null)
    {
        throw new ArgumentNullException(nameof(items));
    }

    // Read by index so finding the final item does not enumerate the whole list.
    return items.Count == 0 ? fallback : items[items.Count - 1];
}
```

### Inheritance and generated output

Distinguish source XML, IDE tooltips, and a documentation generator's output. Visual Studio can display inherited documentation for undocumented overrides and implementations without adding it to compiler-generated XML. Treat `<inheritdoc/>`, or `<inheritdoc cref="Base.Member"/>`, as a request whose expansion must be verified in the actual consuming pipeline. Do not infer expanded output from an inherited tooltip. Add local remarks when the implementation has extra constraints. Never copy synchronous documentation wholesale onto an asynchronous API: result, cancellation, execution, and failure timing may differ. [Inheritance guidance](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/recommended-tags#inheritdoc)

`GenerateDocumentationFile` requests XML generation in SDK projects; `DocumentationFile` controls its destination. The assembly and its XML should be distributed together where consumers need tooltips. CS1591 reports undocumented publicly visible types or members when documentation output is enabled; it does not assess explanation quality. Inspect existing warning configuration before interpreting a clean build. [SDK properties](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props) · [Compiler output](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/output) · [CS1591](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/cs1591)

DocFX's Markdown processing inside XML is a generator feature. Markdown that renders correctly there may display literally in IntelliSense. Favor ordinary XML prose for shared consumers; preserve established DocFX markup and check both surfaces. [DocFX .NET API documentation](https://dotnet.github.io/docfx/docs/dotnet-api-docs.html)

## Visual Basic .NET

Use `' Text.` for ordinary comments and `'''` for declaration XML. `REM` is also a language comment form; do not introduce it into an apostrophe-based codebase. Repeat the delimiter for multiline prose. Preserve line continuations and check language version: comments after explicit continuation are supported from VB 16.0; older documentation describes stricter placement. [VB comments](https://learn.microsoft.com/en-us/dotnet/visual-basic/programming-guide/program-structure/comments-in-code) · [VB version changes](https://learn.microsoft.com/en-us/dotnet/visual-basic/whats-new/)

```vb
''' <summary>Finds the stored revision for a stable item ID.</summary>
''' <param name="id">The item ID assigned when the item was created.</param>
''' <returns>Zero when the item has never been stored.</returns>
Public Function RevisionOf(id As Guid) As Long
    ' Treat missing items as revision zero so the first write follows the same rule.
    Return If(revisions.ContainsKey(id), revisions(id), 0L)
End Function
```

The example assumes an existing dictionary named `revisions`. XML, parameter checking, and `cref` use the VB compiler and its `Imports` scope. Use VB symbol syntax where required, not mechanically copied C# generic spellings. XML generation can use the project property or compiler `-doc` option. Documentation-generator extensions remain tool-specific. [VB XML documentation](https://learn.microsoft.com/en-us/dotnet/visual-basic/programming-guide/program-structure/documenting-your-code-with-xml)

## F#

Ordinary comments use `//` or nested `(* ... *)`. Block-comment parsing also recognizes embedded strings, so do not assume arbitrary text is safe inside a block. [F# lexical specification](https://fsharp.github.io/fslang-spec/lexical-analysis/)

Put `///` before declarations in `.fs` or `.fsi`, including modules, union cases, and record fields. A comment not starting with `<` becomes a plain summary; do not mix that mode with XML tags. For richer contracts use XML consistently:

```fsharp
/// <summary>Finds a saved revision without creating an entry.</summary>
/// <param name="id">The stable item ID.</param>
/// <returns>None when the item has never been stored.</returns>
val tryRevision : id:System.Guid -> int64 option
```

F# `cref` should use full XML IDs such as `T:System.Console`; C# shorthand is not expanded by the compiler. `<include>` and `<inheritdoc>` are copied without compiler expansion. `--warnon:3390` checks XML and parameter references, but not cross-references, type-parameter names, or missing documentation. Preserve existing `WarnOn` entries if configuration work is separately in scope. `GenerateDocumentationFile` emits XML; fsdocs is a separate consumer. Check that signature-file documentation remains aligned with its implementation. [F# XML documentation and limitations](https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/xml-documentation)

## Java

Use ordinary `//` or `/* ... */` for implementation explanation. Declaration documentation normally uses `/** ... */` before the declaration and annotations. Use a short opening description, then relevant `@param name`, `@param <T>`, `@return`, and `@throws ExceptionType` blocks. Use `{@code text}` for literal code and `{@link Type#method(...)}` for references. `{@inheritDoc}` applies to eligible overriding-method documentation; it is not a universal copy instruction for unrelated declarations. Only inherit an unchanged contract. [Javadoc specification](https://docs.oracle.com/en/java/javase/25/docs/specs/javadoc/doc-comment-spec.html)

```java
/**
 * Finds the revision saved for an item.
 *
 * @param id the stable item ID; must not be {@code null}
 * @return zero if the item has never been stored
 * @throws NullPointerException if {@code id} is null
 */
long revisionOf(UUID id);
```

This is an interface-member excerpt. Add caller-visible unchecked failures as well as declared checked failures when the actual contract requires them. State null semantics and whether asynchronous results fail at invocation or completion.

JDK 23+ supports contiguous `///` Markdown documentation. Blank paragraphs still need `///`; an unprefixed blank line separates comments and can discard earlier prose. Do not convert a project before checking its JDK/doclet support. [Oracle Markdown guide](https://docs.oracle.com/en/java/javase/25/javadoc/using-markdown-documentation-comments.html)

`@apiNote`, `@implSpec`, and `@implNote` are useful configured JDK documentation conventions, not tags to assume every project recognizes. OpenJDK explicitly registers them using `-tag`. Preserve the project's tag configuration. [OpenJDK documentation build](https://github.com/openjdk/jdk/blob/master/make/Docs.gmk)

Java translates eligible Unicode escapes before tokenizing comments. A literal Unicode escape in a comment can therefore alter source structure. Do not insert such sequences casually. [Java lexical specification](https://docs.oracle.com/javase/specs/jls/se25/html/jls-3.html)

## Kotlin

Ordinary comments use `//` and `/* ... */`; block comments can nest. [Kotlin syntax](https://kotlinlang.org/docs/basic-syntax.html#comments)

KDoc uses `/** ... */`, Markdown text, and declaration links such as `[RevisionStore]` or `[label][RevisionStore]`. The first paragraph is the summary. Value and type parameters both use `@param` (type parameter `T`, not Java's `<T>`). Kotlin-specific tags include `@receiver`, `@property`, `@constructor`, and `@sample`. Use `@return` and meaningful `@throws` conditions where applicable. KDoc does not support `@deprecated`; `@Deprecated(...)` carries deprecation information. `@suppress` hides an element from generated docs. There is no KDoc overload-signature link syntax. [KDoc reference](https://kotlinlang.org/docs/kotlin-doc.html)

```kotlin
/**
 * Reads the saved revision without adding missing items.
 *
 * @param id The stable item ID.
 * @return Zero when the item has never been stored.
 */
fun revisionOf(id: UUID): Long
```

This is an interface-member excerpt. For `suspend` APIs, describe cancellation, dispatcher requirements, and effects already performed when cancellation happens only where the implementation establishes them. Confirm rendered inheritance rather than inventing Java-style tags. Dokka is the documentation engine; its configured visibility filters and `reportUndocumented`/`failOnWarning` settings determine what its task reports. [Dokka configuration](https://kotlinlang.org/docs/dokka-gradle-configuration-options.html)

## Scala

Scaladoc uses `/** ... */` immediately before a declaration. Start the summary on the opening line when following the standard Scala style. Scala 3 defaults to Markdown; Scala 2 commonly uses wiki markup. Preserve configured syntax, including `@syntax wiki`. Use `@param` for values, `@tparam` for types, `@return`, `@throws`, and class-level `@constructor`. `[[package.Type]]` links to symbols. Missing override documentation may inherit from a superclass; `@inheritdoc` supports explicit inheritance. Confirm the generated result. Preserve `@define` macros and their `$name` uses. [Scala 3 docstrings](https://docs.scala-lang.org/scala3/guides/scaladoc/docstrings.html)

```scala
/** Reads a saved revision without creating an entry.
  *
  * @param id the stable item ID
  * @return zero when the item has never been stored
  */
def revisionOf(id: UUID): Long
```

For `Option`, `Either`, and `Future`, explain what `None`, each side, or a failed future means instead of documenting only the wrapper. Omit repeated method descriptions from tags where they add no information; match the repository's actual requirements. [Scala style guide](https://docs.scala-lang.org/style/scaladoc.html)

## Groovy

Use `//` or `/* ... */` for ordinary comments. Groovydoc uses `/** ... */` before supported types or members and follows Javadoc conventions. A compilable comment in the wrong position can still be absent from generated docs. Use the tags supported by the installed Groovydoc version; do not assume every new JDK doclet feature works in Groovy. [Groovy syntax](https://docs.groovy-lang.org/latest/html/documentation/core-syntax.html#_groovydoc_comment)

```groovy
/**
 * Reads a saved revision without creating an entry.
 * @param id the stable item ID
 * @return zero when the item has never been stored
 */
long revisionOf(UUID id) {
    // Preserve the first-write rule by assigning revision zero to missing items.
    revisions.getOrDefault(id, 0L)
}
```

The example assumes an existing map named `revisions`. Preserve script shebang position. Groovy 3+ has opt-in runtime Groovydoc: `/**@ ... */` plus the `groovy.attach.runtime.groovydoc` setting can retain documentation at runtime. Do not change ordinary documentation to that form during a prose cleanup. [Groovy runtime Groovydoc](https://docs.groovy-lang.org/latest/html/documentation/core-syntax.html#_groovydoc_comment)

## Contracts, controls, and validation

For all these languages, check generics, nullability, empty inputs, units, mutation, ownership, ordering, concurrency, deferred execution, and exceptions against the implementation and tests. Document what the caller must ensure and what the code guarantees. Distinguish a requested cancellation from an observed cancellation; do not promise rollback or thread safety merely because a method is asynchronous. For inherited APIs, preserve substitutability and document real specialization.

Comments can control tools. Preserve generated-file markers, formatter directives, suppression comments, include paths, and snippet markers. Do not insert suppressions or change annotations simply to make a documentation audit pass. In traditional Java Javadoc, adding `@deprecated` can mark a declaration deprecated even without its annotation; Markdown comments require the annotation. Treat this as a semantic change. [Javadoc deprecation rules](https://docs.oracle.com/en/java/javase/25/docs/specs/javadoc/doc-comment-spec.html#deprecated)

Run only applicable, already configured repository tasks: .NET build/XML or DocFX/fsdocs, Java Javadoc, Kotlin Dokka, Scala documentation, or Groovydoc. Discover task names from build files and CI; do not assume a plugin/version or install one during a comment-only audit. Keep existing diagnostic settings. Java DocLint can report syntax, references, missing tags, HTML, and accessibility problems; `-Werror` promotes warnings when configured. It cannot prove intent or full rendered correctness. Inspect representative output, especially inheritance, generics, examples, and links. [Javadoc command and DocLint](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javadoc.html)

Finish with a semantic review of the diff: comments agree with code, meaningful sections have local explanations, control comments are intact, and no behavior changed unintentionally. Report unavailable checks as unavailable rather than claiming validation.
