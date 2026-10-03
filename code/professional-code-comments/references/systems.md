# Systems languages and native code: commenting reference

Research reviewed on 3 October 2026. Follow the repository's compiler version and documentation generator. The recommendations below combine official format rules with an original standard for explaining meaningful sections and critical individual lines.

## Contents

1. [Choose the correct documentation layer](#choose-the-correct-documentation-layer)
2. [C and C++](#c-and-c)
3. [Rust](#rust)
4. [Go](#go)
5. [Swift and Objective-C](#swift-and-objective-c)
6. [Zig](#zig)
7. [Assembly, shaders, and Fortran](#assembly-shaders-and-fortran)
8. [Validate without changing the environment](#validate-without-changing-the-environment)

## Choose the correct documentation layer

Document the callable contract at its declaration; explain the implementation's stages beside the code. A stage comment should identify the operation and the constraint it satisfies. Add individual comments to lines where ordering, arithmetic, ownership, or a workaround is easy to misunderstand. Group ordinary steps under a meaningful section comment instead of repeating their syntax.

This is a proposed quality standard, not a claim that every ecosystem mandates the same density. The [C++ Core Guidelines, NL.1–NL.3](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#nl-naming-and-layout-suggestions) favour intent, concise comments, and information that is not already clear from the code. Complete coverage means that every meaningful section has an explanation; a percentage of commented lines cannot establish that.

## C and C++

Use `//` for normal explanatory lines in C++ and C99 or later; older C dialects need `/* ... */`. Doxygen is a separate documentation system, not C/C++ language syntax. When the project uses it, place `/** ... */`, `/*! ... */`, or its established `///` form next to the declaration. Use `///<` or `/**< ... */` only for supported trailing member/parameter documentation. Avoid copying the whole API description into both the header and implementation. Doxygen's special trailing forms cannot document every kind of entity. File-level extraction may require an `@file` comment under the chosen configuration. See [Doxygen comment blocks](https://www.doxygen.nl/manual/docblocks.html).

Useful [Doxygen commands](https://www.doxygen.nl/manual/commands.html) include `@brief`, `@param[in]`, `@param[out]`, `@tparam`, `@return`, `@retval`, `@exception`, `@pre`, `@post`, `@invariant`, and `@note`. Select fields that add information. Parameter directions describe actual use; they must not disguise ownership transfer. Keep parameter identifiers exact and prefer symbolic cross-references to copied declarations.

For pointer and resource APIs, specify who owns memory, who releases it, null handling, readable/writable extent, alignment, overlap, and how long returned views remain valid. For concurrent code, state what protects shared data, required caller locks, callback re-entry, blocking behaviour, and ordering requirements. At foreign-language boundaries, cover calling convention, representation, exception/error translation, and supported ABI assumptions. Record the evidence for these claims; a comment cannot make undefined behaviour safe.

An original, complete C++ function:

```cpp
#include <array>
#include <cstdint>

/** @file */

/**
 * @brief Reads a four-byte identifier stored in little-endian order.
 * @param bytes The complete identifier field, least significant byte first.
 * @return The identifier as a host integer; the input is unchanged.
 */
std::uint32_t read_id(const std::array<std::uint8_t, 4>& bytes) noexcept {
    // Assemble the field explicitly so host byte order and pointer alignment
    // cannot change how stored records are read.
    // Widen each byte before shifting so it has room for its final bit position.
    return std::uint32_t(bytes[0])
        | (std::uint32_t(bytes[1]) << 8)
        | (std::uint32_t(bytes[2]) << 16)
        | (std::uint32_t(bytes[3]) << 24);
}
```

Preserve preprocessor structure. C/C++ block comments do not nest. Backslash-newline splicing precedes comment removal: an accidental trailing backslash can pull the next line into a `//` comment. Do not insert a line comment into a continued macro or split a continuation without checking the resulting tokens. These are [preprocessor rules](https://gcc.gnu.org/onlinedocs/cpp/Initial-processing.html), not formatting preferences.

Treat compiler-sensitive comments as operational content: GCC recognises some fallthrough comments according to its warning level. Preserve the accepted marker and put the explanation separately; `[[fallthrough]]`, where supported, is a code attribute rather than a comment. See [GCC warning options](https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html). Likewise, `#pragma` is a directive, not prose.

Linux kernel code uses its own [kernel-doc format](https://docs.kernel.org/doc-guide/kernel-doc.html): `function_name() - summary`, `@parameter:`, and sections such as `Context:` and `Return:` inside `/** ... */`. Document sleep/interrupt restrictions and lock requirements there. Do not replace it with Doxygen tags.

## Rust

`///` and `/** ... */` document the following item; `//!` and `/*! ... */` document the containing item, commonly a file's module or crate. These comments become `doc` attributes. Exactly three leading slashes matter: `////` is ordinary commentary. Normal `//` comments belong inside implementation stages. Rust supports nested block comments, but delimiters inside prose/code examples still participate in lexing. Prefer line documentation when examples contain delimiter-like text. See the [Rust Reference](https://doc.rust-lang.org/reference/comments.html).

Use a short summary, details, and applicable `# Examples`, `# Errors`, `# Panics`, and `# Safety` sections. Explain when failures occur and what state remains, rather than merely listing an error type. Unsafe APIs need caller obligations; an internal `// SAFETY:` comment needs the local evidence that satisfies every relevant obligation. Empty sections are unnecessary. These conventions are described by the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/documentation.html) and [rustdoc writing guide](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html).

Original example for `src/lib.rs` in a crate named `comment_demo`:

```rust
//! Helpers for copying bounded portions of stored records.

/// Copies up to `limit` bytes into a separate buffer.
///
/// # Examples
///
/// ```
/// use comment_demo::copy_prefix;
/// assert_eq!(copy_prefix(&[7, 8, 9], 2), vec![7, 8]);
/// ```
pub fn copy_prefix(bytes: &[u8], limit: usize) -> Vec<u8> {
    // Bound the range so a short record still produces a valid prefix.
    let end = limit.min(bytes.len());

    // Copy the selected bytes so callers can reuse their input buffer.
    bytes[..end].to_vec()
}
```

Replace `comment_demo` with the real crate import name when adapting the example. Ordinary Rust fenced examples are compiled and run by rustdoc. `no_run` compiles without execution; `compile_fail` asserts compilation failure; `should_panic` asserts a runtime panic. Use `ignore` only with a concrete reason, not to hide a broken example. Hidden `#` setup lines still compile and must remain correct. See [documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html).

For example, an unsafe slice conversion must account for allocation bounds, initialisation, alignment, nullability, total size, lifetime, and mutation rules. A check of length alone does not prove these. Use the exact called API's safety contract, such as [`slice::from_raw_parts`](https://doc.rust-lang.org/std/slice/fn.from_raw_parts.html), rather than a generic “pointer is valid” assertion. Comments about `Send`, `Sync`, or memory ordering require equally specific reasoning.

## Go

Place doc comments immediately before declarations and start exported-symbol summaries with the symbol name. Package documentation normally starts `Package name ...` before the package clause. Use blank `//` lines for paragraphs. Go documentation supports its own small markup: `// # Heading`, bracketed symbol links, lists, and indented code. It is not unrestricted Markdown. Heading syntax dates from Go 1.19; check older toolchains. A `Deprecated:` paragraph carries recognised meaning. See [Go doc comments](https://go.dev/doc/comment).

Original `wire.go`:

```go
package wire

import "encoding/binary"

// ReadID reads the first four bytes as a little-endian identifier.
// It returns zero and false when the field is incomplete.
// The input is unchanged, and no reference to it is retained.
func ReadID(frame []byte) (uint32, bool) {
    // Reject a partial field before decoding so truncated input cannot panic.
    if len(frame) < 4 {
        return 0, false
    }

    // Use the record's byte order so the same bytes mean the same ID on each CPU.
    return binary.LittleEndian.Uint32(frame[:4]), true
}
```

Example tests go in `_test.go` and use names such as `ExampleReadID`. In a `package wire` test file importing `fmt`, the following checks the documented result:

```go
func ExampleReadID() {
    id, complete := ReadID([]byte{7, 0, 0, 0})
    fmt.Println(id, complete)
    // Output: 7 true
}
```

The terminal `Output:` comment is an assertion. Without an output comment, an example is compiled but not executed. Use `Unordered output:` only when order truly does not matter. See [`testing` examples](https://pkg.go.dev/testing#hdr-Examples).

Preserve `//go:build` near the file top with its required separation from package documentation; it controls file selection. Preserve compiler directives such as `//go:noescape` and their declaration attachment. See [build constraints](https://pkg.go.dev/cmd/go#hdr-Build_constraints) and [compiler directives](https://pkg.go.dev/cmd/compile#hdr-Compiler_Directives). The comment immediately before `import "C"` is a compiled C preamble and may contain `#cgo` options: do not insert prose into it or detach it. See [cgo](https://pkg.go.dev/cmd/cgo). Do not run `go generate` merely to verify prose; its directives execute commands.

## Swift and Objective-C

Swift uses `///` documentation above declarations, with a summary followed by Markdown discussion. Use recognised forms such as `- Parameter name:`, `- Parameters:` with nested parameter entries, `- Returns:`, and `- Throws:`. Document outcomes and meanings; do not add a `Returns` section for `Void`. DocC symbol links use double backticks around the symbol reference. See [Swift API guidelines](https://www.swift.org/documentation/api-design-guidelines/) and [DocC source documentation](https://www.swift.org/documentation/docc/writing-symbol-documentation-in-your-source-files).

Original Swift example:

```swift
/// Keeps selection consistent with the items shown by the view.
/// All access uses the main actor because the view shares this state.
@MainActor
final class SelectionModel {
    /// The selected item, or `nil` when there is no selection.
    var selectedID: String?

    /// Clears selection when its item is no longer visible.
    /// - Parameter validIDs: Identifiers in the current visible collection.
    func retainSelection(in validIDs: Set<String>) {
        // Clear removed items so a later action cannot target a stale selection.
        if let selectedID = selectedID, !validIDs.contains(selectedID) {
            self.selectedID = nil
        }
    }
}
```

For asynchronous APIs, document actor isolation, cancellation behaviour, callback queue, repeated delivery, and observable state across suspension where relevant. Explain retained closures, weak captures, and borrowed buffers using the real ownership contract. `async` alone does not promise background execution; see Apple's [Swift concurrency discussion](https://developer.apple.com/videos/play/wwdc2025/268/). Swift block comments can nest; see [Swift comments](https://docs.swift.org/swift-book/LanguageGuide/TheBasics.html).

Objective-C commonly uses Clang-parsed `///` or `/** ... */` documentation in headers, with the project's chosen generator. Match parameter names and document nullable results, `NSError **` behaviour, and callback ownership. Nullability and ARC attributes are code; preserve them. See [Clang comment parsing](https://clang.llvm.org/docs/UsersManual.html#comment-parsing-options) and [ARC semantics](https://clang.llvm.org/docs/AutomaticReferenceCounting.html). Check both Swift and Objective-C representations for bridged APIs.

## Zig

Zig has line comments, not `/* ... */` block comments. `///` documents the following declaration; `//!` documents the containing namespace and belongs at its beginning. A dangling documentation comment can be a compilation error. Consult the [reference for the repository's Zig version](https://ziglang.org/documentation/master/#Comments); `master` is development documentation, not a version pin.

```zig
//! Bounded views over existing byte buffers.

/// Returns up to `limit` bytes without allocating.
/// The result borrows `bytes`; its storage must outlive every use of the result.
pub fn prefix(bytes: []const u8, limit: usize) []const u8 {
    // Cap the end index so short inputs produce a valid view.
    return bytes[0..@min(bytes.len, limit)];
}
```

Explain allocator ownership, `defer`/`errdefer` cleanup, error sets, aliasing, and sentinel requirements when present. Do not imply that `[]const u8` owns storage or prevents mutation through other aliases. Use the existing documentation build step; compiler flags and build APIs vary by release.

## Assembly, shaders, and Fortran

| Context | Comment and documentation rules |
| --- | --- |
| Assembly | Discover the assembler and target before choosing `#`, `;`, or another marker. GNU assembler line-comment characters are target-dependent; block comments do not nest. Explain register roles, clobbers, flags, stack alignment, calling convention, and instruction ordering. Preserve source-location directives. [GNU assembler comments](https://sourceware.org/binutils/docs/as/Comments.html). |
| GLSL | `//` and `/* ... */`; blocks do not nest. Backslash-newline handling can extend a line comment. Preserve `#version` and extension directives. Explain coordinate space, units, interpolation, precision, and host/shader layout. [GLSL specification, §3.4](https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.4.60.pdf). |
| WGSL | `//` and nested `/* ... */` are supported. Do not apply GLSL's nesting assumption. Explain buffer layout, bindings, workgroup synchronisation, and numerical constraints. [WGSL comments](https://www.w3.org/TR/WGSL/#comments). |
| Fortran | Free-form explanations use `!`; respect fixed-form columns in older sources. FORD defaults to `!!` after an entity and `!>` before it, with configurable markers. Explain array shape, indexing, units, precision, and argument intent. [FORD documentation](https://forddocs.readthedocs.io/en/stable/user_guide/writing_documentation.html). |

Fortran `!$omp` and related fixed-form sentinels can be OpenMP directives, not ordinary comments; preserve them and their continuations. See [GNU Fortran OpenMP](https://gcc.gnu.org/onlinedocs/gfortran/OpenMP.html). For HLSL, Metal, unusual assemblers, or proprietary generators, inspect the existing compiler configuration and official dialect documentation; never assume that a familiar delimiter implies shared extraction or nesting rules.

## Validate without changing the environment

Use tools already configured in the repository. Read build configuration and generator/filter commands before running them. Do not install packages, change dependencies, or weaken warnings merely to make documentation validation available.

| Available workflow | Focused checks |
| --- | --- |
| C/C++ | Existing build and `doxygen Doxyfile`; inspect warnings and one rendered API page. Clang supports `-Wdocumentation` for parameter/return mismatches; use the actual project's include paths and compiler flags with `-fsyntax-only`. |
| Rust | `cargo doc --no-deps`; `cargo test --doc`. Use the existing locked/offline policy. Inspect links and document any examples intentionally not executed. |
| Go | `gofmt -d wire.go` shows formatting changes; `go doc ./path/to/package`; scoped `go test ./path/to/package` verifies examples. Preserve the project's build tags. |
| Swift | Existing Xcode documentation build, or `swift package generate-documentation` if the [Swift-DocC plugin](https://github.com/swiftlang/swift-docc-plugin) is already configured. Inspect symbol links and signature-specific sections. |
| Zig and native formats | Existing docs/build/test targets for the selected version and platform; report unavailable checks precisely. |

These checks detect malformed documentation and some stale contracts. They do not prove intent, ownership, concurrency safety, or complete explanation. Review those against code, tests, callers, and recorded design decisions. Label unresolved intent as unknown rather than inventing a plausible reason.
