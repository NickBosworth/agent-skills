# Link an action to a source file

A finding can identify a page problem without identifying the code that caused it.
If you maintain the website, you can supply a source reference for a finding group.
The tool checks the selected tracked file, its fingerprint and its line range. Your
explanation supplies the connection to the website. The tool does not infer that
connection or certify that the source caused the finding.

Select a local Git repository explicitly. This operation is available through the
CLI and trusted programmatic API. Browser and MCP requests cannot select files or
repositories. No source modification, Git commit or network request is performed.

Create a private JSON input outside this checkout with these fields:

| Field                              | Value                                                             |
| ---------------------------------- | ----------------------------------------------------------------- |
| `auditId`, `analysisId`, `groupId` | The current identifiers from the private report or groups view.   |
| `file`                             | A tracked relative path, such as `src/page.tsx`.                  |
| `sha256`                           | The SHA-256 fingerprint of the exact file bytes you reviewed.     |
| `startLine`, `endLine`             | Inclusive lines in that file, with fewer than 500 selected lines. |
| `rationale`                        | Your explanation of why this file relates to the affected pages.  |

Run from the product directory:

```sh
node dist/cli.js map-source /path/to/private/mapping.json \
  --repository /path/to/website-repository --data /path/to/private/workbench-data
```

The repository must be its Git root. The path uses forward slashes, with ordinary
letters, numbers, underscores, hyphens and dots in file names. Hidden path components,
parent traversal, symbolic links, hard links, untracked files, non-UTF-8 files and
files larger than 2 MB are refused. A fingerprint mismatch or out-of-range line fails
without saving a reference. The operation checks that the analysis and group are
still current before saving. It does not execute repository hooks or source code.

The private database, groups view and handoffs retain the relative path, fingerprint,
line range, your explanation and verification time. They retain neither source text
nor the absolute repository location. Treat these references and explanations as
private project data. Shareable reports omit them. Audit deletion and manual retention
remove the selected audit's references; existing backups and copied reports survive.

A saved reference describes the file version checked at the recorded time. It cannot
guarantee that the file remains unchanged afterward. Reanalysis does not silently
carry the reference into a new analysis: review and submit it again for the current
finding. A matching file fingerprint proves file identity, not a confirmed root cause,
correct fix, deployed version or fresh website evidence.

Git must be installed for this optional operation. `doctor` reports whether its
executable is available. Core crawling, reports and MCP use do not require Git.
The development test suite includes real tracked-file cases and therefore needs Git.
