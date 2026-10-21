# Accepted dependency rules

ARCH-004: Domain MUST NOT use types from Provider. Host feature types MUST NOT use
Provider types. Only the exact type Fixture.Host.Composition may reference Provider
for wiring. The entire Host assembly is not exempt. Implement this accepted guard
with the existing checker, preserving syntax/semantic error reporting.
