# Public testing preview: completion plan

The maintainer requested this plan on 2026-10-12 and authorised its local execution,
followed by a stop. The outcome is reviewed source and a clean-installable preview
that can be published for supervised testing. Publication remains a separate action.
This plan supersedes the earlier instruction to continue until the entire stable
release backlog is complete. That backlog remains in
[production readiness](production-readiness-plan.md); its unverified items are not
marked complete by preparing this preview.

The subsequent request to complete outstanding work resumes local implementation.
The completion record below remains the earlier preview checkpoint; current
increments and unmet stable gates are recorded in [verification](verification.md)
and [production readiness](production-readiness-plan.md). Publication remains on hold.

Use Ponytail for the smallest complete implementation, Awesome Copy for reader-facing
language, Development Planning for compatibility and verification, and Agentic
Codebase for repository guidance. Preserve scope validation, sandboxed Chromium,
immutable observations, private storage, accessibility and public-data safeguards.
Do not add a service, dependency or feature solely to make the preview look finished.

## Steps and acceptance

1. **Define the preview.** Keep version 0.1.0 labelled as a development preview.
   Identify what works locally and what testers must verify. Preserve the broader
   stable-release backlog and the publication hold. No npm or GitHub release is
   part of this work.
2. **Finish the current crawler fixes.** Verify compressed responses, gzip sitemaps,
   final-attempt handling, server retry waits, cancellation, pause/recovery and
   bounded discovery. Add regressions for any reproduced defect. Keep existing
   captures readable without a destructive migration.
3. **Review public copy and claims.** Audit the interface, reports, help and public
   setup/capability documents. Remove empty slogans and misleading certainty.
   Preserve necessary terms, machine fields, legal notices and captured site text.
   Label historical checks and unsupported or unverified integrations clearly.
4. **Verify the main journeys.** Use original synthetic data to check CLI, browser,
   HTTP and official SDK MCP use, audit controls, comparison, imports, reports and
   evidence access. Include errors and partial coverage. Host/model acceptance
   remains a tester task; SDK success is not a claim about every MCP host.
5. **Verify a clean installation.** Build the existing deterministic review archive,
   install its locked dependencies outside the checkout, run the doctor and demo,
   and check its compiled entry points. Optional Chromium uses its sandbox. Docker
   is not installed, started or required.
6. **Review publication safety.** Inspect the actual candidate files, changed prose,
   Git identities, licences, notices, source fixtures and archive inventory. Run
   library privacy, staged-candidate, reachable-history and redacted credential
   checks. Keep real-site addresses, captures, logs, databases, credentials and
   machine-specific files outside source. Record scanner limits; never claim
   automated scans can prove the absence of all personal information.
7. **Run the final local gates.** Run strict source checks, a clean build, all product
   tests with browser and package checks selected, all library validators/helpers,
   dependency auditing, privacy/history scans and a final diff check. Fix failures
   without weakening tests. Record the exact scopes and unavailable platforms.
8. **Freeze the candidate.** Prepare the reviewed ZIP outside the repository, verify
   its inventory and checksums, and record a fingerprint of the source/test/package
   inputs. Confirm inputs stayed unchanged through final verification. Do not
   stage generated files or modify the actual Git index as a substitute for review.
9. **Prepare tester instructions.** Provide source and archive setup, a fictional
   first audit, optional browser and MCP steps, expected partial states and private
   bug-report guidance. Explain how testers should record platform/runtime versions
   without sharing identifiers, captures or secrets.
10. **Hand over and stop.** Record the results below and in the verification ledger.
    Recommend public preview testing only if steps 1–9 pass. Keep stable-release
    limitations explicit. Leave publication to the maintainer and stop the broader
    autonomous implementation as requested.

## Required local commands

From the product directory:

```sh
npm run check
npm run build
WORKBENCH_BROWSER_TESTS=1 WORKBENCH_PACKAGE_TESTS=1 npm test
npm audit --omit=dev
python tools/prepare_release.py --out /path/to/seo-workbench-preview.zip
```

From the repository root, using the pinned Python development environment:

```sh
python tools/check_library.py
python tools/run_checks.py
python tools/check_library.py --staged
python tools/check_library.py --history
gitleaks git . --redact --log-opts=--all
```

The archive destination must be outside the checkout. Before a future commit, the
staged-content check must run against the actual proposed index. Before a future
push, inspect the remote revision and history; local readiness is not push approval.

## Earlier preview completion record

The local preparation steps were completed on 2026-10-12. Strict checking and a
clean build passed. All 344 product tests passed with browser and package checks
selected, with no failures or skips. Twenty-one focused collection, error, robots
and worker checks passed. All nine skill validators and 234 library helper checks
passed. Runtime dependency auditing found no known vulnerabilities.

Candidate, actual-index and reachable-history privacy checks passed, as did
redacted credential scans. The anonymous Git identity and enabled private
vulnerability reporting were verified. Manual review covered the changed copy,
publication inventory, notices and synthetic fixtures. These checks reduce risk;
they cannot prove that every possible sensitive value is absent.

The reviewed archive contains 186 payload files and its checksum manifest. A clean
installation outside the checkout passed the runtime doctor and fictional demo.
The 106 source, test and package inputs stayed unchanged through verification.
The local handover includes the final archive checksum and installation results.
The candidate is suitable for supervised public preview testing. No source push,
public CI run, package publication or stable release was performed. Autonomous
implementation stops at this handover as requested.

For a future source publication, review the intended diff, stage only reviewed
source files, run the actual staged-content gate and commit using the anonymous
repository identity. Re-run the history and redacted credential checks, inspect
the current remote revision and use a normal push if its tip remains an ancestor
of the reviewed local history. A changed or divergent remote needs a fresh review;
this plan does not authorise a force push. Keep generated archives, captures and
local state outside the repository.

Suggested commit message: `Prepare SEO Workbench for public preview testing`.

## Testing after publication

Native Windows/Linux browsers, additional processor architectures, interactive
host/model journeys, live Search Console/provider acceptance, manual assistive
technology checks and independent security/SEO review remain unverified unless
their own records show otherwise. Testers should start with the synthetic demo,
then use sites and data they control. These checks inform the stable release;
they are not silently assumed successful by this preview.
