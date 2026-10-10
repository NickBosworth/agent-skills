# Public repository policy

This policy covers tracked source, staged blobs, reachable Git history, releases,
fixtures, images, generated evidence and publication logs. It is a repository
policy, not a statement that all personal information can be detected by software.

## Allowed material

Original skill instructions, necessary self-contained helpers, synthetic examples,
maintained templates, public primary-source links, reviewed assets, licence notices
and sanitized verification summaries. Preserve legally required attribution;
do not interpret privacy policy as permission to erase another author's notices.
The project's public GitHub locator may identify its owner outside this checkout.
No private contact address or biographical detail is needed in shipped packages.

Use `example.com`, `example.org`, `example.net`, `.example`, `.test` or `.invalid`
for fictional services and contacts. A believable provider key is not a useful
fixture: construct unmistakably dummy values that cannot authenticate. Local URLs
may illustrate a development server; they must not embed credentials or expose
private infrastructure. Temporary paths are obtained at runtime, not pasted from
a person's machine. Privacy checks fail with paths and categories, not values.

## Prohibited material

Real credentials, personal contacts, device/user paths, private identifiers,
customer exports, issue/chat/email transcripts, raw analytics, database dumps,
local agent sessions/configuration, shell history, editor/Finder state, caches,
virtual environments, build artifacts and backup repositories. Encoding or placing
data in a test, comment, SVG or archive does not make it public-safe. Never use
`git add -f` to evade this policy. Review explicit file selections before staging.

## Enforcement and limits

`tools/check_library.py` examines staged blobs separately from worktree files;
it rejects prohibited paths, credential-like fields, personal email patterns,
user-home paths, symlinks, unsupported binary types and PNG ancillary metadata.
History mode examines reachable commits and unique blobs, including deleted files,
and checks Git identity emails and names. Gitleaks supplies broader provider-key
and entropy rules. Neither tool detects every name, phone number, face, address,
encoding or confidential fact. Human review remains required, especially for
images, arbitrary prose and published reports.

CI runs after a push or pull request: it cannot undo an exposure. Enable GitHub
secret scanning and push protection where available. Contributors may opt into
the supplied pre-commit hook; hooks are bypassable. Required branch checks need
repository settings and do not become mandatory just because workflow YAML exists.

## Incident handling

Stop the affected publication. Report only the location/type through a private
channel; do not put sensitive evidence in an issue. Revoke/rotate exposed secrets
first. Remove source and release copies, assess reachable history and GitHub
surfaces, and coordinate a rewrite only with authorization. Re-clone after a
rewrite to avoid reintroducing old commits. Forks, caches and downloaded copies
may remain; contact GitHub Support where its removal procedures apply.

## Research basis

- [GitHub sensitive-data removal](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [GitHub push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [Reserved example domains](https://www.iana.org/help/example-domains)

Reviewed for this policy on 2026-10-10. Revisit when scanners, GitHub capabilities
or the types of distributed artifacts change. A source link is not a certification.
