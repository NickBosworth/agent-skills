# Operations, data, and configuration commenting

Research checked: 3 October 2026. This reference combines official language and tool documentation with an editorial standard for explaining operational intent. It is guidance for a commenting skill, not instructions to run infrastructure.

## Contents

1. [What an operational comment must explain](#1-what-an-operational-comment-must-explain)
2. [Syntax and documentation formats](#2-syntax-and-documentation-formats)
3. [SQL and migrations](#3-sql-and-migrations)
4. [Shell scripts and PowerShell](#4-shell-scripts-and-powershell)
5. [Deployment and build configuration](#5-deployment-and-build-configuration)
6. [Data, patterns, and generated files](#6-data-patterns-and-generated-files)
7. [Validation without operating infrastructure](#7-validation-without-operating-infrastructure)

## 1. What an operational comment must explain

Place a short explanation before each meaningful operation or tightly related section. Explain the result and the reason together. Use a line comment for an exceptional boundary, ordering constraint, quoting rule, or value that would otherwise be easy to change incorrectly. A comment such as “Set timeout” adds little; “Allow 30 seconds for the worker to finish its current request before stopping it” explains a contract.

For each relevant section, establish:

- Inputs: environment variables, arguments, working directory, required privileges, units, time zone, defaults, and unset versus empty behavior.
- Outputs and side effects: stdout versus stderr, exit status, files written, resources changed, credentials consumed, and persistent state.
- Ordering: what must exist first, concurrency limits, locks, retries, and what prevents duplicate work.
- Failure and recovery: partial completion, cleanup, idempotency, rollback limits, and the supported recovery route.
- Rationale: the requirement, observed failure, or measured constraint behind an unusual choice.

Verify these claims against code, configuration, tests, and recorded decisions. If intent is unknown, describe the observed behavior and record the unanswered question; never invent an operational guarantee. The examples below use explicitly illustrative requirements.

## 2. Syntax and documentation formats

Identify the actual parser and dialect before editing. An extension alone is insufficient for `.sql`, `.yaml`, `.env`, `.ini`, or embedded scripts.

| Language or file | Ordinary prose syntax | Documentation or behavior-sensitive details |
|---|---|---|
| PostgreSQL | `-- text`; `/* text */` | Block comments nest. `COMMENT ON … IS '…'` changes database metadata; it is a SQL statement. [Grammar](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-COMMENTS), [COMMENT](https://www.postgresql.org/docs/current/sql-comment.html). |
| MySQL | `-- text`, `# text`, `/* text */` | After `--`, require whitespace or a control character. Preserve `/*!…*/` executable comments and `/*+…*/` optimizer hints exactly unless their behavior is intentionally being changed. [Manual](https://dev.mysql.com/doc/refman/8.4/en/comments.html). |
| SQL Server / T-SQL | `-- text`; `/* text */` | Block comments nest. Do not confuse SQL clauses such as `OPTION` or `WITH` hints with prose. [Block comments](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/slash-star-comment-transact-sql), [query hints](https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-query). |
| SQLite | `-- text`; `/* text */` | Comments are whitespace to the parser; block comments do not nest. [Grammar](https://www.sqlite.org/lang_comment.html). |
| Bash / POSIX sh | `# text` in an unquoted comment position | No native block-comment syntax. Preserve the initial shebang, continuations, expansions, and tool directives. A here-document is input to a command. [Bash comments](https://www.gnu.org/s/bash/manual/html_node/Comments.html), [redirections](https://www.gnu.org/s/bash/manual/html_node/Redirections.html). |
| Zsh | Normally `# text` | Interactive comments depend on `INTERACTIVE_COMMENTS`; the comment character can depend on `histchars`. Do not infer interactive behavior from script behavior. [Zsh manual, Shell Grammar](https://zsh.sourceforge.io/Doc/zsh_a4.pdf). |
| PowerShell | `# text`; `<# text #>` | Comment-based help uses dot keywords. `#Requires` is an enforced prerequisite; signature blocks have integrity significance. [Help](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_comment_based_help), [requirements](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_requires). |
| Windows batch / cmd | `REM text` on its own command line | Prefer the documented `REM` command over label tricks such as `::`. Redirection and pipe characters require particular care even in remarks. [REM](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/rem). |
| Dockerfile | Whole comment lines beginning with `#` | `# syntax=`, `# escape=`, and `# check=` are parser directives. An inline `#` elsewhere belongs to the instruction argument or its embedded language. [Reference](https://docs.docker.com/reference/dockerfile/). |
| Terraform / HCL | Prefer `#`; also `//` and `/*…*/` | Use supported `description` attributes for variables and outputs. These are real schema fields, not lexical comments. JSON-form configuration follows different rules. [Syntax](https://developer.hashicorp.com/terraform/language/syntax/configuration), [variables](https://developer.hashicorp.com/terraform/language/values/variables), [outputs](https://developer.hashicorp.com/terraform/language/values/outputs). |
| YAML: Kubernetes, Ansible, CI | `# text`, separated from preceding tokens by whitespace | No block-comment syntax. Inside `|` or `>` scalar content, a `#` belongs to the stored value and may be interpreted by another language. [YAML 1.2.2](https://yaml.org/spec/1.2.2/#66-comments). |
| GNU Make | `# text` outside protected contexts | Recipe comments go to the recipe shell. Preserve recipe tabs or the configured recipe prefix, continuations, and Make expansions. [Contents](https://www.gnu.org/software/make/manual/html_node/Makefile-Contents.html), [recipes](https://www.gnu.org/s/make/manual/html_node/Recipe-Syntax.html). |
| CMake | `# text`; `#[[ text ]]` or `#[=[ text ]=]` | Bracket comments use matching delimiter levels. Follow an existing documentation generator's conventions; no universal API documentation tag set follows from CMake syntax. [Language](https://cmake.org/cmake/help/latest/manual/cmake-language.7.html#comments). |
| Nix | `# text`; `/* text */` | Block comments do not nest. Preserve `/**…*/` attachment when the project uses Nix documentation tools. [Language](https://nix.dev/manual/nix/2.34/language/syntax#comments), [official formatter standard](https://github.com/NixOS/nixfmt/blob/master/standard.md). |
| `.env` | Parser-specific; commonly `# text` | Quoting and inline-comment rules vary. Node's parser treats quoted `#` as value content. Never source a file merely to inspect it. [Node specification](https://nodejs.org/api/environment_variables.html). |
| INI / `.cfg` | Parser-specific; commonly whole-line `;` or `#` | Do not assume inline comments are supported. Python `configparser` disables them by default. [Parser documentation](https://docs.python.org/3/library/configparser.html). |
| TOML | `# text` outside strings | No block-comment syntax; preserve literal and multiline strings. [Specification](https://toml.io/en/v1.0.0#comment). |

CUE uses `//` line comments only; it does not inherit C-style block comments merely because its syntax looks familiar. Comments act as newlines, which matters to comma insertion. See the [CUE specification](https://cuelang.org/docs/reference/spec/#comments).

No universal documentation generator format exists for SQL, shell, Dockerfile, Make, YAML, or arbitrary configuration. Follow a repository's configured tools; do not invent Javadoc-style tags that nothing consumes.

## 3. SQL and migrations

Explain a query's result grain, joins and duplicate handling, null meaning, currency or measurement units, filtering boundaries, ordering, and any intentional loss of rows. Annotate each CTE or major transformation with its role in the result. Explain a hint using actual evidence and the condition under which it can be removed.

Original example: `completed_orders` contains one row per completed order, with a non-null amount in its currency's minor unit. The prepared-statement parameters are timestamp bounds.

```sql
-- Total each account's orders by currency so unlike monetary units stay separate.
SELECT account_id, currency_code, SUM(total_minor) AS total_minor
FROM completed_orders
-- Exclude the end instant so consecutive billing windows do not share an order.
WHERE completed_at >= $1
  AND completed_at < $2
GROUP BY account_id, currency_code;
```

For migrations, document prerequisites, transaction boundaries, deployment ordering, backfill assumptions, expected blocking, and whether reversing the schema can actually recover lost data. Do not claim a transaction makes every dialect's DDL reversible. Do not edit applied migration history to improve prose without checking the migration system's immutability and checksum rules.

`COMMENT ON` stores or replaces metadata and takes a `SHARE UPDATE EXCLUSIVE` lock in PostgreSQL. Route such changes through the normal migration workflow; a passive-comment audit does not justify running them. Database comments can be visible to other database users, so they must not contain secrets. [PostgreSQL COMMENT](https://www.postgresql.org/docs/current/sql-comment.html).

Liquibase's `--liquibase formatted sql`, `--changeset`, and `--rollback` lines control migration interpretation. Keep directive content and placement intact. Comments that resemble ordinary SQL prose can define changeset boundaries or rollback statements. [Liquibase formatted SQL](https://www.liquibase.com/blog/liquibase-formatted-sql).

## 4. Shell scripts and PowerShell

For reusable shell functions, document purpose, globals read or modified, arguments, output streams, and nontrivial return statuses. Put explanation before a continued command or pipeline. This follows the useful parts of [Google's shell commenting guidance](https://google.github.io/styleguide/shellguide.html#s7-comments), while allowing the host repository's formatting.

Do not place prose after a continuation backslash, move the shebang, or treat `#` inside a quoted value as a comment. Quoting a here-document delimiter suppresses expansion of its contents in Bash; adding prose inside the body changes the command's input. A construction such as `: <<'TEXT'` still involves executing a command and redirection, so it is not a substitute for passive block comments. [Bash redirections](https://www.gnu.org/s/bash/manual/html_node/Redirections.html).

PowerShell help should use `.SYNOPSIS`, `.DESCRIPTION`, `.PARAMETER`, `.EXAMPLE`, `.INPUTS`, `.OUTPUTS`, `.NOTES`, and `.LINK` when relevant, without filling meaningless sections. Keep the help topic contiguous and correctly attached to its function or script. Defaults, wildcard behavior, and side effects belong in the parameter or behavior descriptions. Preserve `.EXTERNALHELP` when external XML help is authoritative. [Comment-based help](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_comment_based_help).

Original example with an illustrative 30-second delay cap:

```powershell
function Get-RetryDelaySeconds {
    <#
    .SYNOPSIS
    Returns the delay before another attempt, in seconds.
    .PARAMETER Attempt
    One-based attempt number, from 1 to 10. Defaults to 1.
    .OUTPUTS
    System.Int32. The function returns a delay; it does not wait.
    .EXAMPLE
    Get-RetryDelaySeconds -Attempt 4
    #>
    param([ValidateRange(1, 10)][int] $Attempt = 1)

    # Double the delay after each failure, capped to keep retries responsive.
    [int] [Math]::Min(30, [Math]::Pow(2, $Attempt - 1))
}
```

`#Requires` applies to the entire script and can import required modules; keep it separate from explanatory prose. Recognize signed scripts before editing: content changes can invalidate their signature, including apparently harmless encoding changes. Preserve signature material and use the established signing workflow. [Requirements](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_requires), [Microsoft signature troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/windows-client/system-management-components/signed-powershell-script-fails-hash-mismatch).

## 5. Deployment and build configuration

Explain resource sizing, units, network exposure, grace periods, dependencies, and unusual defaults. A field's `description`, an Ansible task's `name`, a CI step's `name`, and a Kubernetes annotation are real configuration data. Editing them may be useful documentation work, but it is not a lexical-comment-only change. Ansible explicitly recommends names and comments that explain both actions and reasons. [Ansible guidance](https://docs.ansible.com/projects/ansible/latest/tips_tricks/ansible_tips_tricks.html), [Kubernetes annotations](https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/).

Original Terraform example with a stated worker requirement:

```hcl
variable "shutdown_grace_seconds" {
  description = "Seconds allowed for active work to finish before termination."
  type        = number

  # Workers need 30 seconds to finish; reserve 15 more for cleanup.
  default = 45
}
```

Do not use comments to claim validation that the configuration does not enforce.

Docker parser directives must remain above ordinary comments and blank lines; inserting a title before them changes recognition. Preserve instruction ordering, line continuations, and the shell selected for `RUN`. Comment the reason for stages, cache-sensitive ordering, ownership, and signal handling where those decisions matter. [Dockerfile reference](https://docs.docker.com/reference/dockerfile/).

For YAML containing scripts, respect both grammars. In a GitHub Actions `run: |` block, comments are part of the script string. Keep the declared shell, interpolation, indentation, and scalar style intact. [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

For Make, distinguish Make parsing from recipe-shell parsing. Make expands recipe text before the shell interprets it; a shell comment is not a safe place for arbitrary Make expressions. Preserve leading recipe tabs and significant trailing spaces in variable assignments. Inline comments can introduce significant trailing spaces in Make variable values; keep those values unchanged. For CMake and Nix, document configuration-time effects separately from build-time effects. [Make assignment rules](https://www.gnu.org/software/make/manual/html_node/Simple-Assignment.html).

## 6. Data, patterns, and generated files

Strict JSON and CSV have no general-purpose comment mechanism. Do not add `_comment` keys, extra CSV rows, YAML fields, or XML elements as if they were passive prose. Use supported schema descriptions or a nearby document tied to the actual file and field names. JSONC and JSON5 require explicitly compatible consumers. [JSON grammar](https://www.rfc-editor.org/rfc/rfc8259), [CSV format](https://www.rfc-editor.org/rfc/rfc4180).

Document a regex's accepted language, anchoring, captures, Unicode assumptions, and representative accepted/rejected inputs outside the pattern by default. PCRE2 supports `(?#…)` and, in extended modes, `#` comments; those modes also change whitespace interpretation. Do not enable a mode or insert whitespace merely to accommodate comments. Other engines differ. [PCRE2 pattern specification](https://www.pcre.org/current/doc/html/pcre2pattern.html).

For generated, minified, vendored, signed, binary, lock, snapshot, fixture, or checksum-sensitive files, first identify the source of truth. Improve the generator, template, schema, or nearby documentation when appropriate. Preserve bytes where they are part of a contract; do not hand-annotate outputs that regeneration will replace. For example, npm documents `package-lock.json` as automatically generated. [npm lockfile documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/).

## 7. Validation without operating infrastructure

Use only tools already available in the repository or environment, with the correct language version and trusted configuration. Compare parsed structure or token streams where supported, while explicitly allowing documented metadata changes. Then inspect every explanation against implementation evidence; syntax checks cannot establish intent.

Suitable local checks include a trusted SQL parser with the correct dialect; an existing shell linter; PowerShell's `Parser.ParseFile`; a safe YAML/TOML/JSON parser; `terraform fmt -check`; and `nix-instantiate --parse`. Shell syntax-only invocations require a controlled startup environment so profile or environment hooks do not execute unexpectedly. Report unavailable checks instead of installing dependencies or initializing projects. [PowerShell parser](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.language.parser.parsefile?view=powershellsdk-7.4.0), [Terraform formatting](https://developer.hashicorp.com/terraform/cli/commands/fmt), [Nix parse mode](https://nix.dev/manual/nix/2.34/command-ref/nix-instantiate).

Do not run migrations, application scripts, Docker builds, Terraform initialization/plans/applies, playbooks, CMake configuration, Nix evaluation/builds, or cluster/API commands just to validate prose. `make -n` is not a passive parser: recursive or `+` recipes can still execute, and Make can remake included makefiles. Use a static parser or inspection instead. [GNU guidance on dry runs](https://www.gnu.org/software/automake/manual/1.13.2/html_node/Debugging-Make-Rules.html).
