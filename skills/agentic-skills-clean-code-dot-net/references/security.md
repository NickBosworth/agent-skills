# Everyday security review

Load for untrusted inputs, file/process/network boundaries, deserialization or
sensitive output. DNC-SEC-001; sources S59–S61. This is a focused coding review,
not a penetration test or security certification.

MUST identify the trust boundary and preserve authorization independently of
validation. A valid identifier does not grant access to its record. Review input
length/shape and resource limits where input drives expensive work. Retain
parameterized SQL and context-appropriate output encoding.

File access MUST preserve the approved base directory and containment policy.
Path.Combine is not a containment check. Review traversal, absolute paths,
case/comparison rules, symlinks and race conditions for the actual filesystem.
A lexical prefix check cannot establish resolved-file containment. Prefer the
repository's reviewed file-access helper over a universal path sanitizer.
For process execution, use structured arguments and an approved executable;
avoid assembling shell commands from untrusted text. Argument arrays alone do
not prevent dangerous options to the invoked program.

MUST NOT introduce unsafe polymorphic deserialization or let input select arbitrary
runtime types. BinaryFormatter is insecure even with a custom binder. Use an
approved format with explicit supported types; preserve size/depth limits and
review serializer options when external contracts change. Do not incidentally
switch formats or erase compatibility obligations during cleanup.

MUST preserve TLS certificate validation; never replace it with an always-true
callback to make requests succeed. Custom trust needs explicit requirements and
failure tests. Do not invent crypto, store credentials in source or treat
general-purpose hashes as password storage.

Boundary errors/logs MUST omit credentials, sensitive payloads and internal detail
that callers do not need. Preserve useful private diagnostics under the actual
access/retention policy; redaction must not turn failure into success. Use synthetic
fixtures and do not contact production services for examples.

Check relevant installed security analyzers with focused probes and preserve
stricter repository gates. Do not enable every rule globally or assume analyzer
success proves safety. The certificate-bypass fixture is compiled for detection,
never executed against a network. Test rejected input, unauthorized access and
failure reporting when those boundaries change; no malicious payload is needed.
