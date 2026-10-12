/** Public explanations use fixed text so private diagnostic values are never echoed. */
const messages: Record<string, string> = {
  "extractor-must-be-synchronous":
    "This trusted extractor returned asynchronous work. Use a synchronous JSON callback; no custom facts were recorded.",
  "extractor-output-budget":
    "This trusted extractor returned too much data. Return a bounded set of custom facts rather than copying the whole capture.",
  "extractor-manifest-mismatch":
    "This audit requires the same trusted extractor definitions used when collection began. Resume it through that embedding application with the same versions, or start a fresh audit; the standard runner cannot load those callbacks.",
  "extractor-manifest-missing":
    "This audit already contains captures without an extractor manifest. Start a fresh audit to collect new custom facts; existing capture history cannot be rewritten.",
  "extractor-definition-invalid":
    "A trusted extractor has an invalid definition or callback. Review the embedding application; imported project settings cannot load extractor code.",
  "extractor-id-conflict":
    "Two trusted extractors use the same identifier. Give each extractor a distinct, versioned identity before collecting evidence.",
  "provider-definition-invalid":
    "The trusted provider has an invalid identity or callback. Review its adapter before allowing any evidence transfer.",
  "import-not-found":
    "The selected import was not found in this project. Choose a saved import from the same project as this audit.",
  "search-period-selection-invalid":
    "Choose two different saved periods, with an earlier baseline and a later comparison period.",
  "search-period-metrics-invalid":
    "The selected search period contains totals that cannot be compared safely. Review the original private import before using its metrics.",
  "network-policy-option-unsupported":
    "This network policy contains an unsupported setting. Use only approved development origins and the trusted resolver option.",
  "content-review-record-invalid":
    "A saved content review no longer matches the supported contract. Stop this review and inspect the private record before relying on it.",
  "content-distinct-need-required":
    "A new-page proposal needs a complete owner draft, reviewed existing pages and an explicit distinct reader need that those pages do not answer. Improve an existing page or reject the idea when that need is not established.",
  "content-brief-page-unavailable":
    "An existing page named in the brief has no successful saved HTML evidence in this approved audit scope. Collect or correct that page before recording a complete draft.",
  "content-brief-link-scope":
    "A proposed internal link falls outside the audit's approved scope. Correct the link or review scope separately; the brief cannot expand permissions.",
  "provider-cache-invalid":
    "The saved model advice does not match its provider, model version, prompt or evidence. No interpretation was requested. Review the saved private records before retrying.",
  "model-allowance-record-invalid":
    "The saved model allowance is incomplete or inconsistent. Stop model requests and review the private data before continuing.",
  "model-allowance-change-refused":
    "This audit already has different model limits. Keep its approved limits or start a new audit; restarting does not reset usage.",
  "model-price-unavailable":
    "A monetary ceiling was selected, but this adapter has no verified price. No generation was authorized. Use an adapter with verified pricing before relying on a cost limit.",
  "model-provider-limit-violated":
    "The provider previously reported output above its reserved limit. Further requests for this audit are blocked until the provider behavior is reviewed.",
  "model-audit-allowance-exhausted":
    "This audit has used its generation or output allowance. Failed and interrupted attempts still count. Start a separately approved audit if more work is needed.",
  "model-reservation-settlement-invalid":
    "The model usage record cannot be safely completed. Its reservation still counts; review the private allowance records before retrying.",
  "resource-unavailable":
    "A required browser resource could not be supplied. Check the website response and approved resource permissions before retrying.",
  "resource-size-budget":
    "A browser resource exceeded the permitted response size. Review the resource and the project’s byte allowance before retrying.",
  "local-lighthouse-unavailable":
    "Lighthouse did not return a complete navigation measurement. Check the page response and the browser’s time allowance before retrying.",
  "local-lighthouse-failed":
    "The Lighthouse worker could not finish. Check the installed Chromium browser or selected image and configured limits; no complete measurement series was saved.",
  "invalid-lighthouse-message":
    "The local speed-test worker received an unsupported message. Use matching reviewed worker and host builds before retrying.",
  "lab-target-scope":
    "Choose a page within the project’s approved crawl scope.",
  "lab-robots-unavailable":
    "The website’s crawl policy could not be checked. Resolve the response or connection problem before running a local speed test.",
  "lab-robots-blocked":
    "The website’s crawl policy does not allow this request. Choose an allowed page; do not bypass the policy.",
  "lab-page-unavailable":
    "The requested page did not return a successful HTML response. Check the page address before testing its speed.",
  "lab-measurement-incomplete":
    "The local speed test did not collect a complete set of measurements and permitted resources. No partial series was saved. Check the browser, resource permissions and time allowance before retrying.",
  "local-provider-call-budget":
    "The local model's generation allowance is invalid or has been used. The schema probe counts toward this allowance. Review the configured limit before trying again.",
  "rule-extension-invalid":
    "A developer-supplied rule has an invalid definition or evaluator. Review the trusted extension contract before running it.",
  "rule-extension-id-conflict":
    "A developer-supplied rule repeats an existing identifier. Give each extension a distinct identifier; built-in rules cannot be replaced.",
  "storage-full":
    "Storage could not accept more data. Check available disk space and any applied storage capacity limit, then retry. Keep the original data folder while resolving the problem.",
  "backup-incomplete":
    "This backup did not finish verification. Use the original data folder, remove only the incomplete backup folder and create a new backup.",
  "backup-inside-repository":
    "Choose a new backup folder outside the source repository. Backups contain private audit evidence.",
  "backup-jobs-active":
    "Wait for queued or running audits to stop before making a recovery backup.",
  "backup-integrity-failed":
    "The backup failed its database checks and was removed. The original data has not been replaced.",
  "retention-future-cutoff":
    "Choose a retention cutoff in the past. Future dates cannot select histories for cleanup.",
  "retention-selection-changed":
    "The histories changed after the cleanup preview. Generate a new preview and review its selection before deleting anything.",
  "provider-call-budget":
    "The model call allowance is invalid or has been used. Review the allowance before requesting another suggestion.",
  "provider-input-budget":
    "The evidence is too large for the model’s input allowance, or the allowance is invalid. Choose fewer pages or review the configured limit.",
  "provider-time-budget":
    "Choose a whole-number model timeout from 100 to 60,000 milliseconds.",
  "provider-capability-invalid":
    "The model adapter did not provide valid capability information. Check its configuration before sending page evidence.",
  "action-review-analysis-changed":
    "The analysis changed after this action was opened. Reload the Actions view, review the current evidence and save again.",
  "invalid-result-pagination":
    "Choose a whole number of findings from 1 to 1,000,000 and a starting position of zero or greater.",
  "results-memory-budget":
    "These findings or the report are too large to return together within the output allowance. Read fewer findings at a time, or export a complete report with the CLI report command and --out. No partial report or comparison has been returned.",
  "report-analysis-changed":
    "The saved analysis changed or was removed during export. No complete report was created. Choose a retained analysis and try again.",
  "export-file-exists":
    "A file already exists at the chosen report path. Choose a new filename; the existing file has not been replaced.",
  "results-count-budget":
    "This audit has more findings than a complete report or comparison can include. Read the findings in pages; no incomplete report or comparison has been returned.",
  "comparison-mapping-invalid":
    "The page mapping is invalid. Use HTTP or HTTPS page addresses without credentials or fragments. An origin change needs both old and new origins, with no path or query.",
  "performance-provenance-invalid":
    "The measurement period or website scope is inconsistent. Check the original measurement, then correct the import dates and scope.",
  "audit-not-runnable":
    "This audit is stopped. Resume it explicitly to continue, or start a new audit.",
  "database-symlink-blocked":
    "The data folder contains a linked database file. Choose a dedicated data folder with ordinary files; existing files have not been replaced.",
  "database-file-blocked":
    "A database path is not an ordinary, unshared file. Choose a dedicated data folder; existing files have not been replaced.",
  "input-file-required":
    "Choose an ordinary JSON file. Folders and device files cannot be used as input.",
  "local-server-start-failed":
    "The local workbench could not start. Check whether its port is already in use, or choose another port.",
  "dns-timeout":
    "The website address could not be resolved within the time limit. Check the connection and try again.",
  "dns-failed":
    "The website address could not be resolved. Check the address and your connection before trying again.",
  "audit-worker-capacity":
    "Another audit is already running. Wait for it to finish, or pause it before starting this one.",
  "audit-worker-active":
    "This audit is still running. Wait for it to stop before changing or deleting its saved data.",
  "audit-worker-stopping":
    "The audit is still stopping. Wait a moment, then try again.",
  "audit-limit-reached":
    "This audit has used its configured allowance. Start a new audit with revised crawl settings; its saved evidence will remain available.",
  "audit-already-complete":
    "This audit has finished. Start a new audit to collect fresh evidence.",
  "audit-not-found":
    "This audit could not be found. Choose an audit from the project list.",
  "project-not-found":
    "This project could not be found. Choose a saved project or create one.",
  "page-evidence-not-found":
    "No saved evidence was found for this page in the selected audit.",
  "analysis-not-found":
    "No completed analysis is available for this audit yet. Check its status before trying again.",
  "invalid-url":
    "Enter a valid HTTP or HTTPS page URL without a username or password.",
  "out-of-scope-config-url":
    "A configured page falls outside the permitted website or paths. Review your crawl settings.",
  "duplicate-origin":
    "The settings list the same website origin more than once. Remove the duplicate entry.",
  "scope-blocked":
    "This page falls outside the websites or paths permitted for this audit.",
  "network-address-blocked":
    "The destination is not permitted by the network safety rules. Review the authorised website settings.",
  "import-size-budget":
    "The import is too large. Use a data file smaller than 5 MB.",
  "imports-memory-budget":
    "The saved imports exceed this project's reading allowance. Use a project with fewer imported records or a larger memory allowance. No partial set was returned.",
  "source-mapping-invalid":
    "The source reference is invalid. Supply the current audit, analysis and group identifiers, a relative file path, its SHA-256 fingerprint and a valid line range of fewer than 500 lines.",
  "source-mapping-repository-required":
    "Select the local Git repository explicitly with --repository. The browser and MCP tools cannot select local source files.",
  "source-mapping-file-invalid":
    "The selected source must be a tracked, regular UTF-8 file smaller than 2 MB within the selected Git repository. Hidden paths, symbolic links and hard links are refused.",
  "source-mapping-fingerprint-changed":
    "The source file differs from the supplied fingerprint. Review the current version before saving a reference.",
  "source-mapping-lines-invalid":
    "The selected line range extends beyond the source file. Check the current file and line numbers.",
  "input-size-budget":
    "The input is too large. Use a data file smaller than 5 MB.",
  "request-body-budget":
    "The submitted data is too large. Use a data file smaller than 5 MB.",
  "import-project-scope":
    "The imported pages fall outside this project. Check the file and the project’s permitted websites.",
  "duplicate-import-row":
    "The import contains duplicate rows for the same measurement. Remove duplicate entries and try again.",
  "content-review-evidence-mismatch":
    "This decision refers to evidence that does not belong to the selected page. Reload the page and try again.",
  "action-review-group-not-found":
    "This action is no longer available in the selected analysis. Reload the Actions view and try again.",
  "data-directory-inside-repository":
    "Choose a data folder outside the source repository. Captured pages and private data must not be stored in the checkout.",
  "export-inside-repository":
    "Save the report outside the source repository to keep private evidence out of the checkout.",
  "persistent-storage-budget":
    "The audit could not continue within its saved-data limit. Review coverage and any saved results, then start a new audit with more storage or a narrower scope.",
  "analysis-memory-budget":
    "There is too much collected evidence for the configured analysis memory limit. Narrow the audit or explicitly increase its memory limit.",
  "rate-limited":
    "The website asked the crawler to stop sending requests. Respect its limits and review the permitted scope before retrying.",
  "access-denied":
    "The website refused access. Review your permission and the site’s access restrictions before retrying; the crawler will not bypass them.",
  "page-budget":
    "The page limit was reached. Start a new audit with a higher page limit or a narrower scope to collect more pages.",
  "discovery-budget":
    "The page-discovery limit was reached. Some URLs could not be added. Review the scope and discovery limit before starting another audit.",
  "memory-budget":
    "The audit reached its memory allowance. Review collected evidence, then narrow the scope or explicitly increase the allowance for a new audit.",
  "collection-incomplete":
    "Some discovered pages could not be checked. Review their saved status and access restrictions before retrying.",
  "rendering-incomplete":
    "Some requested browser checks did not finish. Review each page’s browser status before drawing conclusions about rendered content.",
  "sitemap-incomplete":
    "At least one sitemap could not be fully checked. Its pages may be missing from this audit’s inventory.",
  "user-pause": "The audit is paused. Its saved evidence remains available.",
  "user-paused": "The audit is paused. Its saved evidence remains available.",
  "user-cancel":
    "The audit was cancelled. Its saved evidence remains available.",
  "user-cancelled":
    "The audit was cancelled. Its saved evidence remains available.",
  "storage-budget":
    "The audit reached its download limit. Start a new audit with revised download settings or a narrower scope.",
  "request-budget":
    "The audit reached its request limit. Review coverage, then start a new audit with revised limits or a narrower scope.",
  "download-budget":
    "The audit reached its download limit. Review coverage, then start a new audit with revised limits or a narrower scope.",
  "time-budget":
    "The audit reached its time limit. Review coverage, then start a new audit with revised limits or a narrower scope.",
  "provider-transfer-consent-required":
    "This action sends data to a provider. Review the destination and explicitly authorise the transfer before continuing.",
  "provider-credential-unavailable":
    "The provider credentials are unavailable. Configure them locally; do not put them in the repository or an import file.",
  "lab-audit-concurrency-blocked":
    "A crawl is running. Wait for it to finish before collecting speed-test measurements.",
  "delete-confirmation-required":
    "Deletion requires the explicit confirmation option. Review which saved data will be removed before continuing.",
  "unknown-command":
    "This command is not recognised. Open the command help to see the supported commands.",
  "host-blocked":
    "This request used an unexpected local address. Reopen the workbench using its displayed local URL.",
  "origin-blocked":
    "The request came from another website. Reopen the workbench using its displayed local URL.",
  "cross-site-blocked":
    "Requests from other websites are not permitted. Use the local workbench page.",
  "session-required":
    "The local session is unavailable. Reload the workbench page and try again.",
  "verification-ruleset-mismatch":
    "The baseline uses a different rule set. Choose Check saved evidence again, then make a new plan. Earlier analyses will be retained.",
  "verification-scope-invalid":
    "The selected recheck URLs exceed the project's permitted scope. Review the original project permissions before planning a new run.",
  "verification-plan-stale":
    "The baseline analysis changed after this plan was made. Make a new plan from the current analysis.",
  "verification-plan-not-found":
    "This recheck plan could not be found. Choose a saved plan from the project.",
  "verification-group-not-found":
    "This finding group is unavailable in the selected analysis. Choose a current group and try again.",
  "verification-plan-budget":
    "The recheck plan is too large to save safely. Use a smaller group or a full audit.",
  "verification-audit-mismatch":
    "The newer audit does not match this recheck plan and project. Start a run from the saved plan before verifying it.",
  "verification-baseline-active":
    "The baseline is still being collected or analysed. Wait for the worker to stop before planning a recheck.",
  "database-transaction-active":
    "Another operation is already using this database connection. Finish that operation before starting a worker or measurement. Its transaction has not been changed.",
  "database-upgrade-worker-active":
    "An older worker may still be using this data. Stop the worker before upgrading, then open the data again. No upgrade was committed.",
  "database-version-newer-than-product":
    "This data folder was created by a newer Workbench version. Open it with that version; do not downgrade or replace the saved database.",
  "dns-empty":
    "The website address did not resolve to an IP address. Check the address and try again.",
  "insufficient-provider-evidence":
    "No usable page passage is available for the model. Collect page evidence before requesting a suggestion.",
  "invalid-local-origin":
    "The local permission must identify an HTTP service on an explicit loopback address and port. Review the operator settings.",
  "invalid-network-timeout":
    "The network timeout is invalid. Choose a finite positive duration.",
  "invalid-page-sort":
    "The requested page order is unsupported. Choose one of the page view’s available sort options.",
  "invalid-result-sort":
    "The requested finding order is unsupported. Choose one of the findings view’s available sort options.",
  "invalid-sitemap-location":
    "A sitemap entry could not be interpreted as a supported page address. Review the sitemap and its scope.",
  "invalid-sitemap-root":
    "The document is not a supported sitemap or sitemap index. Check the original file before importing it.",
  "local-model-completion-unavailable":
    "The selected local model does not report text-generation support. Choose a supported installed model.",
  "local-model-generation-failed":
    "The local model could not finish generation. Check the local model service before retrying.",
  "local-model-unavailable":
    "The selected local model is unavailable. Check the installed model name and local service.",
  "local-provider-cloud-model-blocked":
    "This adapter permits local models only. Choose an installed local model; cloud-backed models are refused.",
  "local-provider-endpoint-blocked":
    "The model request used an unsupported local address or API route. Review the adapter settings.",
  "local-provider-input-budget":
    "The full local model request exceeds its input allowance. Select fewer page passages.",
  "local-provider-json-invalid":
    "The local model service returned data that could not be read. Check its response format before retrying.",
  "local-provider-output-budget":
    "The local model response exceeds its reading allowance. Reduce the requested output.",
  "local-provider-response-aborted":
    "The local model response ended unexpectedly. No complete suggestion was received.",
  "local-provider-response-failed":
    "The local model response could not be read. Check the service and retry within the configured allowance.",
  "local-provider-timeout":
    "The local model did not respond within the permitted time. Check the service before trying again.",
  "local-provider-token-budget":
    "The local model reported more generated text than its token allowance permits. Its advice was refused.",
  "local-provider-unavailable":
    "The local model service could not be reached. Check that it is running at the configured loopback address.",
  "malformed-sitemap":
    "The sitemap could not be read as valid XML. Correct the original file before collecting it again.",
  "port-blocked":
    "This website uses a port outside the permitted public web ports. Review the website address.",
  "provider-connection-failed":
    "The configured service could not be reached. Check connectivity and provider availability before retrying.",
  "provider-credential-name-invalid":
    "The credential environment-variable name is invalid. Use a name containing capital letters, digits and underscores; never supply the credential itself as an argument.",
  "provider-date-window":
    "The requested measurement dates are invalid. Choose a valid start date no later than the end date.",
  "provider-dimensions-invalid":
    "The requested search-data dimensions are unsupported. Review the provider’s supported query settings.",
  "provider-endpoint-blocked":
    "The provider request used an unsupported API route or method. Review the adapter settings.",
  "provider-field-device-mismatch":
    "The field measurement describes a different device group from the request. It was refused rather than treated as a matching result.",
  "provider-field-identity-mismatch":
    "The field measurement identifies a different website or page from the request. Review the returned identity before importing it.",
  "provider-field-query-failed":
    "The service could not provide the requested field measurement. Check its availability and the requested scope.",
  "provider-field-scope-mismatch":
    "The returned field measurement has a different page or website scope from the request. It was refused.",
  "provider-inspection-unavailable":
    "The indexed-page inspection is unavailable. Check authorised property access and the requested page.",
  "provider-invented-destination":
    "The model proposed a page outside the supplied evidence. Its suggestion was refused.",
  "provider-invented-evidence":
    "The model cited a record that was not supplied. Its suggestion was refused.",
  "provider-json-invalid":
    "The service returned data that could not be read as structured JSON. No successful import was created.",
  "provider-lab-device-mismatch":
    "The speed-test result uses a different device configuration from the request. It was refused.",
  "provider-lab-identity-mismatch":
    "The speed-test result identifies a different requested page. Review its page identity before importing it.",
  "provider-lab-query-failed":
    "The speed-test service could not run the requested measurement. Check the service and requested page.",
  "provider-lab-run-failed":
    "The speed-test run did not finish successfully. Its metrics were not accepted as a complete measurement.",
  "provider-output-budget":
    "The model response exceeds its output allowance. No suggestion was accepted.",
  "provider-response-aborted":
    "The service response ended unexpectedly. No complete result was received.",
  "provider-response-budget":
    "The service response exceeds the reading allowance. Reduce the requested result size where supported.",
  "provider-response-failed":
    "The service response could not be read. Check the provider and try again.",
  "provider-schema-unavailable":
    "The selected model did not demonstrate the required structured-output support. Choose a supported model.",
  "provider-target-scope":
    "The requested page or website is outside this project. Review the project and provider target.",
  "provider-timeout":
    "The service did not respond within the permitted time. Check provider availability before retrying.",
  "provider-timeout-or-cancelled":
    "The model request timed out or was cancelled. No complete suggestion was accepted.",
  "provider-unsupported-advice":
    "The model’s suggestion lacks the evidence references required for review. It was refused.",
  "render-response-budget":
    "The browser’s page content exceeds its response allowance. Its rendered evidence was not accepted.",
  "resource-budget":
    "The requested saved evidence exceeds this response allowance. Read a smaller view or use the bounded local export commands.",
  "resource-origin-blocked":
    "A browser resource belongs to a website outside the permitted origins. Review the explicit resource permissions.",
  "resource-scope-blocked":
    "A browser resource falls outside the permitted paths. Review the explicit resource scope.",
  "response-aborted":
    "The website response ended unexpectedly. The page was not recorded as a successful complete fetch.",
  "response-failed":
    "The website response could not be read. Check the recorded attempt and retry when appropriate.",
  "response-decompression-failed":
    "The compressed response is incomplete or damaged. Its content could not be read reliably; retry the request or check the server.",
  "response-budget":
    "The downloaded or expanded response exceeded the configured size allowance. Its content was not saved as a complete response; review the allowance before retrying.",
  "robots-redirect-limit":
    "The robots instructions redirected too many times. Review the redirect chain before treating access permissions as known.",
  "robots-redirect-loop":
    "The robots instructions redirect in a loop. Correct that loop before collecting the instructions again.",
  "robots-redirect-scope-blocked":
    "The robots instructions redirect outside the authorised scope. Access permissions remain unknown.",
  "rule-extension-result-budget":
    "A developer-supplied rule returned more data than its result allowance permits. Reduce the result before using the extension.",
  "rule-unavailable":
    "The evaluator for this check is unavailable. Review the installed rule definition and implementation.",
  "sitemap-unavailable":
    "The configured sitemap could not be retrieved. Its page membership remains unknown.",
  "unsupported-content-encoding":
    "The website uses an unsupported response compression format. Review the server’s content encoding.",
  "view-not-found":
    "This view is not supported. Choose an available Workbench view.",
  "xml-entities-blocked":
    "The XML document contains entity declarations that are not permitted. Use a sitemap without external or custom entities.",
  cancelled: "The operation was cancelled. Saved evidence remains available.",
};
export function explainError(code: string): string {
  return isPublicErrorCode(code)
    ? messages[code]
    : "The operation could not be completed. Check your settings and the supported input format, then try again. Private diagnostic values have been left out.";
}

/** Only maintained diagnostic labels may cross adapter output boundaries. */
export function isPublicErrorCode(code: string): boolean {
  return Object.hasOwn(messages, code);
}
