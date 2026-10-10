# Contributing
Contribute original improvements under the pack's CC0-1.0 dedication. Do not paste copyrighted articles, proprietary datasets, credentials or real customer exports into a pull request.

For a new rule, identify its applicability, engine, evidence class, current primary source, useful test, remedy, false positives and verification. Keep the entry concise and update the routed reference rather than expanding the entire SKILL.md. Do not add universal ranking guarantees, invented thresholds or vendor scores as engine requirements.

For changed guidance, update the source access/review date, research decisions, affected rules/examples and a regression test or agent evaluation case. Distinguish a source clarification from a changed feature. Explain commercial/vendor conflicts rather than hiding them.

For code, keep the utilities offline and standard-library-only unless a reviewed requirement justifies an explicitly documented dependency. Do not introduce live crawling, credential use, auto-installation, telemetry or publication as an incidental patch. Respect bounded inputs and no-overwrite output behaviour.

Run from the repository root:
```sh
python -m unittest discover -s tests -v
python scripts/validate_pack.py
```
For a release, regenerate `MANIFEST.sha256` after all tracked content is final, then run the validator with `--verify-checksums`. See `scripts/README.md`. A CI matrix defines intended coverage; only executed jobs establish tested versions.
