# Original brief: acceptance coverage

This index maps every original brief section to runnable checks and the remaining
acceptance. It identifies coverage, not a certification: a file may test selected
cases without exercising every requirement. Run the product suite with browser
and package checks selected before relying on its local evidence.

| Brief | Runnable local checks | Remaining acceptance |
| --- | --- | --- |
| 1 Repository and skills | Root library validators/helpers; packaging.test.ts | Final candidate drift review |
| 2 Sources and provenance | provenance.test.ts; schema-review.test.ts; source/rule inventories | Wider applicability and independent source assessment |
| 3 Shared workflows | core.test.ts; browser.test.ts; mcp.test.ts; verification.test.ts; monitoring.test.ts | Independent usability and wider migration/opportunity journeys |
| 4 Architecture and extensions | recovery.test.ts; worker-lock.test.ts; extensions.test.ts; extractors.test.ts | Native platforms, physical faults and arbitrary trusted callback review |
| 5 Immutable evidence and lifecycle | core.test.ts; maintenance.test.ts; verification.test.ts | Physical storage/recovery and operator retention acceptance |
| 6 Collection coverage | collection-protocol.test.ts; compression.test.ts; robots.test.ts; language-alternates.test.ts | Wider protocol/sitemap/profile corpus and independent completeness review |
| 7 Rendering | rendering.test.ts; compression.test.ts; browser.test.ts; benchmark.ts | Native platform/architecture matrix, wider interaction states and full-render scale |
| 8 Rule accuracy | core.test.ts; response-directives.test.ts; structured-features.test.ts; schema-review.test.ts | Independent ground truth, missed defects and false-positive assessment |
| 9 Specialist domains | structured-features.test.ts; language-alternates.test.ts; search-controls.test.ts | Wider ecommerce, local, editorial, documentation, UGC/paywall and sitemap profiles |
| 10 Owner intent | core.test.ts; actions.test.ts; structured-features.test.ts; verification.test.ts | Wider reviewed inference and feature contracts |
| 11 Remediation | actions.test.ts; source-mapping.test.ts; verification.test.ts; browser.test.ts | Independent cause/dependency/usefulness assessment |
| 12 Content and demand | content.test.ts; similarity.test.ts; search-comparison.test.ts; site-data.test.ts; browser.test.ts | Live first-party acceptance and wider editorial/adapter outcomes |
| 13 Measurements | local-lighthouse.test.ts; performance.test.ts; providers.test.ts; search-comparison.test.ts | Native browser matrix and live supplier/outcome acceptance |
| 14 AI-search controls | search-controls.test.ts; external-research.test.ts | Live observations and broader provider coverage |
| 15 Optional model advice | enrichment.test.ts; ollama.test.ts; model-allowance.test.ts; extensions.test.ts | Configured live model, independent fidelity/harm/abstention and priced-adapter acceptance |
| 16 MCP | mcp.test.ts; verification.test.ts; local-lighthouse.test.ts | Actual interactive host/model approvals, reconnection and injection evaluation |
| 17 UI and reports | browser.test.ts; large-ui.test.ts; report-summary.test.ts; streaming-reports.test.ts | Manual assistive/visual acceptance and larger reading/print journeys |
| 18 Security | core.test.ts; public-errors.test.ts; rendering.test.ts; recovery.test.ts; root privacy/history/credential gates | Independent exact-candidate assessment and native private-file controls |
| 19 Verification and monitoring | verification.test.ts; monitoring.test.ts; maintenance.test.ts | Operator scheduler and authorised outbound integration acceptance |
| 20 Evaluation and scale | benchmark.ts; capacity.test.ts; import-capacity.test.ts; large-ui.test.ts | Larger full rendering, live advice and independent usefulness evaluation |
| 21 Increment delivery | Dated verification ledger; task checkpoints; scoped guidance | Remaining stable implementation and acceptance rows R01–R28 |
| 22 Maintenance and distribution | packaging.test.ts; local-paths.test.ts; read-only native CI definitions; root gates | Native CI execution, maintenance ownership, independent clearance and publication approval |

Test files are in `tests/` in the source checkout. The runnable archive deliberately
omits contributor tests and root-library resources. The stable plan owns detailed
dependencies; this index does not replace them or treat an unrun scenario as passed.
