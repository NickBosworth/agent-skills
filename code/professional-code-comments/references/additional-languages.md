# Additional languages and formats

Research checked against the linked primary documentation on 2026-10-03. This reference extends the main language guides; it does not claim to cover every compiler, dialect, or documentation generator. Prefer the version and conventions already used by the repository.

## Contents

- [MATLAB and GNU Octave](#matlab-and-gnu-octave)
- [Solidity and Vyper](#solidity-and-vyper)
- [D, Delphi/Pascal, Ada, and COBOL](#d-delphipascal-ada-and-cobol)
- [HLSL and Metal](#hlsl-and-metal)
- [LaTeX and BibTeX](#latex-and-bibtex)
- [Fish and Nushell](#fish-and-nushell)
- [Verification and fallback](#verification-and-fallback)

## MATLAB and GNU Octave

MATLAB uses `%` for line comments and `%{` / `%}` for blocks; block markers must stand alone on their lines. `%%` creates editor/publishing sections, so adding it changes the document's working structure. Preserve continuation syntax and existing analyzer controls such as `%#ok<...>`. Sources: [MathWorks comments](https://www.mathworks.com/help/matlab/matlab_prog/comments.html), [Code Analyzer](https://www.mathworks.com/help/matlab/matlab_prog/check-code-for-errors-and-warnings.html).

For a function, place the help block immediately below its declaration, or use the documented placement below an `arguments` block when supported. Start with a short name-and-purpose line. Keep blank lines inside the help block as `%` lines: an uncommented blank line ends help extraction. Document array shape, the dimension being processed, units, missing-value policy, and numerical limits where they matter. `See also` supports related function links. Source: [MathWorks help text](https://www.mathworks.com/help/matlab/matlab_prog/add-help-for-your-program.html).

Original example, saved as `columnEnergy.m`:

```matlab
function energy = columnEnergy(samples)
% COLUMNENERGY Sum squared sample magnitudes for each column.
%   SAMPLES is a real or complex floating-point matrix.
%   ENERGY has one value per column. NaN values propagate.
%   Very large magnitudes can overflow the floating-point range.
%
%   See also ABS, SUM

% Square magnitudes so phase does not change each sample's contribution.
energy = sum(abs(samples).^2, 1);
end
```

MATLAB `publish` evaluates code by default. Use the existing approved publishing workflow; `evalCode=false` is available for a presentation-only review. A published document containing captured errors is not evidence that examples passed. Preserve Live Editor text and code boundaries. Source: [publish options](https://www.mathworks.com/help/matlab/ref/publish.html).

Octave also accepts `#` line comments and `#{` / `#}` blocks. Help extraction and Texinfo conventions deserve separate inspection; do not assume MATLAB tooling equivalence. Crucially, `%!test`, `%!assert`, and `%!demo` contain executable material, and indentation after `%!` changes block interpretation. Preserve those blocks as code and run only the relevant existing tests. Sources: [line comments](https://docs.octave.org/latest/Single-Line-Comments.html), [block comments](https://docs.octave.org/latest/Block-Comments.html), [help](https://docs.octave.org/latest/Comments-and-the-Help-System.html), [embedded tests](https://docs.octave.org/latest/Test-Functions.html).

## Solidity and Vyper

Solidity's compiler recognizes NatSpec in `///` or `/** ... */` comments directly above supported declarations. Use `@notice` for the caller-facing explanation, `@dev` for implementation constraints, `@param` with exact parameter names, and `@return` for results. Contract-level `@title`, inheritance via `@inheritdoc`, and `@custom:...` tags have defined uses. NatSpec resembles Doxygen but is not fully compatible with it; extraction of internal/private documentation must not be assumed. Source: [Solidity NatSpec](https://docs.soliditylang.org/en/latest/natspec-format.html).

For contracts, explain amounts and units, rounding, caller permissions, revert conditions, state transitions, external calls, and the reason for ordering. Establish these facts from code and tests; a comment must not invent a security guarantee. Original small example:

```solidity
pragma solidity >=0.8.20 <0.9.0;

/// @title Time unit conversion helpers
contract TimeUnits {
    /// @notice Converts milliseconds to completed seconds.
    /// @dev Rounds down so an incomplete second is not counted.
    /// @param milliseconds Duration measured in milliseconds.
    /// @return seconds_ Number of complete seconds.
    function wholeSeconds(uint256 milliseconds)
        external pure returns (uint256 seconds_)
    {
        return milliseconds / 1000;
    }
}
```

Use the project's pinned compiler, not this example's range, for an existing project. Preserve SPDX license declarations and tool-specific custom tags. With existing tooling, `solc --userdoc --devdoc Contract.sol` produces documentation outputs. Even whitespace or comment edits can change source hashes, metadata, and the metadata hash embedded in default bytecode. Therefore, do not promise byte-identical deployment artifacts after comment-only changes. Source: [Solidity metadata](https://docs.soliditylang.org/en/latest/metadata.html).

Vyper uses triple-quoted NatSpec docstrings at module scope and inside external functions. Its compiler validates supported tags and parameter names; internal functions are not parsed for documentation output. Existing `vyper -f userdoc,devdoc file.vy` can check extraction. Preserve docstring placement and indentation. Source: [Vyper NatSpec](https://docs.vyperlang.org/en/stable/natspec.html).

## D, Delphi/Pascal, Ada, and COBOL

| Language and tool | Format, attachment, and traps |
| --- | --- |
| D / Ddoc | `///`, `/** ... */`, and `/++ ... +/` introduce documentation. A separate comment normally describes the next declaration; a same-line trailing comment describes that declaration. Use a summary and sections such as `Params:` and `Returns:`. Preserve Ddoc macros and deliberate `ditto` reuse. Documented `unittest` blocks can supply examples that execute when tests are enabled; arbitrary displayed code is not automatically tested. Sources: [Ddoc](https://dlang.org/spec/ddoc.html), [unit tests](https://dlang.org/spec/unittest.html). |
| Delphi / Pascal | Ordinary forms include `//`, `{ ... }`, and `(* ... *)`, subject to dialect. Delphi XMLDoc uses `///` with well-formed XML such as `<summary>`, `<param name="x">`, and `<returns>`, immediately before the symbol. This is Delphi tooling support, not a universal Pascal feature. Preserve existing fpdoc/PasDoc conventions when those tools are selected, and keep compiler directives such as `{$...}` intact. Sources: [Delphi comments](https://docwiki.embarcadero.com/RADStudio/Sydney/en/Delphi_Comments), [XML documentation](https://docwiki.embarcadero.com/RADStudio/Athens/en/XML_Documentation_Comments). |
| Ada / GNATdoc | Ada uses `--`. GNATdoc interprets structured comments and tags such as `@param`, `@return`, and `@exception`. Leading/trailing attachment depends on entity kind, selected style, and GNATdoc version. Read the project's `.gpr` and documentation configuration before moving comments. Older and newer releases differ in options and supported tags. Source: [current GNATdoc guide](https://docs.adacore.com/live/wave/gnatdoc4/pdf/gnatdoc-doc/gnatdoc_ug.pdf). |
| COBOL | In fixed format, `*` or `/` in column 7 marks a comment; slash can affect compiler listings. Free format uses `*>`, also supported for inline comments by relevant dialects. Preserve columns, continuation indicators, source-format directives, debugging lines, and initial control cards. Explain record layouts, decimal units, paragraph purpose, and restart assumptions. Sources: [GnuCOBOL source formats and comments](https://gnucobol.sourceforge.io/HTML/gnucobpg.html), [IBM comment lines](https://www.ibm.com/docs/en/cobol-zos/6.4.0?topic=b-comment-lines). |

## HLSL and Metal

Use ordinary `//` and `/* ... */` comments. Microsoft specifies these delimiters for HLSL; Metal uses C++-based shader syntax. Documentation-generator support is repository-specific. Explain coordinate spaces, texture units, color space, buffer layout, precision, and why a barrier or approximation is needed. Keep preprocessor directives, binding attributes, and compiler controls unchanged. Sources: [HLSL preprocessing](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-appendix-preprocessor), [Apple's Metal language overview](https://developer.apple.com/videos/play/wwdc2019/611/).

## LaTeX and BibTeX

Under normal LaTeX character rules, unescaped `%` comments through the line ending. A trailing `%` may intentionally prevent a space in a macro; verbatim and changed character codes require separate handling. In `.dtx` files, documentation and extracted code interact: preserve DocStrip guards such as `%<*package>` and `%</package>`. Sources: [LaTeX source documentation](https://latex-project.org/help/documentation/source2e.pdf), [DocStrip](https://ctan.math.illinois.edu/macros/latex/base/docstrip.pdf).

BibTeX `.bib` is different: `%` is not a general comment marker. Use supported top-level `@Comment{...}` material or external documentation, respecting the actual parser. A `note` field changes bibliography content and is not a source comment. Source: [BIBTEXing](https://ctan.math.illinois.edu/biblio/bibtex/base/btxdoc.pdf).

## Fish and Nushell

Fish uses `#` line comments, with no block-comment syntax. Nushell collects consecutive `#` lines immediately before a `def` into command help; parameter comments can also become help text and require proper spacing. Keep help attachment intact and inspect it using the existing shell's help facilities. Sources: [Fish comments](https://fishshell.com/docs/current/language.html#comments), [Nushell custom commands](https://www.nushell.sh/book/custom_commands.html).

## Verification and fallback

Use installed, pinned tools and existing targets. Inspect extracted help and documentation warnings; run affected examples when the repository already supports them. Do not execute a whole script, enable shell escape, install a generator, or deploy a contract merely to check prose. When extraction support is uncertain, retain valid ordinary comments and report the exact unverified capability. The original MATLAB and Solidity examples above were reviewed but not executed for this reference.
