# Examples and invocation prompts

## Contents

- [Full C# example](#full-c-example)
- [A legacy explanation that must remain unresolved](#a-legacy-explanation-that-must-remain-unresolved)
- [A comment can cover a small section](#a-comment-can-cover-a-small-section)
- [Preserve an operational comment](#preserve-an-operational-comment)
- [Prompts to use after installation](#prompts-to-use-after-installation)

These examples are original. Their requirements are stated here to make their reasons reviewable. Do not transplant a sample's business policy into an existing project without evidence. Adapt the invocation prefix to the host if it does not support `$skill-name`.

## Full C# example

Illustrative requirements: a schedule maps each ID to its first eligible instant; equality means ready. The caller supplies one time for the whole selection. Return a new array of ready IDs in ordinal order so the result is independent of dictionary enumeration order and process culture. The caller must not change the dictionary while the method reads it.

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>Selects ready work from an in-memory schedule.</summary>
public static class ScheduleSelection
{
    /// <summary>
    /// Returns the IDs whose scheduled time has arrived, in ordinal order.
    /// </summary>
    /// <param name="scheduledAt">
    /// IDs and their first eligible instant. The caller must not change this
    /// dictionary while the method reads it.
    /// </param>
    /// <param name="now">The instant to use for every readiness comparison.</param>
    /// <returns>
    /// A new array of ready IDs, or an empty array when no work is ready.
    /// The input dictionary is unchanged.
    /// </returns>
    /// <exception cref="ArgumentNullException">
    /// <paramref name="scheduledAt"/> is <see langword="null"/>.
    /// </exception>
    /// <remarks>
    /// An item scheduled exactly at <paramref name="now"/> is ready.
    /// Supplying the time allows callers and tests to choose a stable snapshot.
    /// </remarks>
    public static string[] GetReadyIds(
        IReadOnlyDictionary<string, DateTimeOffset> scheduledAt,
        DateTimeOffset now)
    {
        // Reject a missing schedule before enumeration so the error names
        // the invalid input instead of failing later inside the query.
        if (scheduledAt is null)
        {
            throw new ArgumentNullException(nameof(scheduledAt));
        }

        // Collect ready IDs using one instant so elapsed time cannot change
        // the decision while the schedule is being read.
        var readyIds = scheduledAt
            // Include equality because an item becomes ready at its scheduled time.
            .Where(entry => entry.Value <= now)
            .Select(entry => entry.Key)
            .ToArray();

        // Apply ordinal order so enumeration order and process culture do not
        // change the order returned to the caller.
        Array.Sort(readyIds, StringComparer.Ordinal);
        return readyIds;
    }
}
```

The API documentation explains the caller's contract. Three implementation sections explain validation, selection, and ordering. A local comment explains the inclusive boundary. The code and stated requirements support these reasons; no assumed incident, benchmark, or undocumented supplier rule is needed.

For the full XML vocabulary, compiler settings, inheritance, escaping, and tool distinctions, use `dotnet-jvm.md`. The surrounding project determines which XML tags and warning policies are mandatory.

## A legacy explanation that must remain unresolved

Suppose a legacy function contains:

```python
# Deny access when the policy service is unavailable.
try:
    return policy_service.allows(user)
except TimeoutError:
    return True
```

The comment and implementation conflict. Code establishes that a timeout returns `True`; it does not establish whether availability or denial is the intended policy.

In an audit, identify the exact function and branch, cite the conflicting evidence, explain the consequence, and ask for or locate the intended timeout policy. In a comment-only repair, do not change the return value and do not invent a reason such as “Allow access to protect availability.” Keep the conflict visible in the findings. Where an authoritative current requirement establishes denial, report a behavioural defect that needs the appropriate authorized fix.

A useful single question is: “The timeout branch allows access, while its comment requires denial. Which policy is authoritative? The existing security requirement, if still current, supports denial.” Offer only options that genuinely remain uncertain after checking available requirements, tests, and history.

## A comment can cover a small section

Illustrative Python requirement: `amounts` is a sequence of nonnegative integer minor-unit amounts. The caller validates values. Produce a cumulative total for each position, with no mutation of the input.

```python
def cumulative_amounts(amounts: list[int]) -> list[int]:
    """Return the running minor-unit total at each input position.

    The caller supplies nonnegative integer amounts in one currency.
    The input is unchanged; an empty input produces an empty list.
    """
    # Keep a running balance so each position includes all earlier amounts
    # without summing the earlier entries again.
    balances = []
    total = 0
    for amount in amounts:
        total += amount
        balances.append(total)
    return balances
```

The section comment covers initialization, accumulation, and recording because they serve one goal. Repeating “Create a list,” “Set total to zero,” and “Add the amount” would add little understanding. If a later change introduces currency conversion, rejection, or rounding, that creates additional decisions needing their own explanation and contract update.

## Preserve an operational comment

A Dockerfile can begin:

```dockerfile
# syntax=docker/dockerfile:1

# Keep the existing frontend selection above ordinary prose.
FROM alpine:3.21
```

The first line selects the Dockerfile frontend. Moving it below an ordinary header comment can stop directive recognition. This excerpt demonstrates placement; it is not a recommendation to choose that image version or to build the file during a documentation task.

Similarly, preserve `//go:build`, TypeScript suppressions, SQL optimizer hints, type-bearing JSDoc, Python encoding cookies, and PowerShell requirements exactly unless their behaviour is within the requested change. Put explanations where they do not change attachment or interpretation.

## Prompts to use after installation

### 1. Generate code with the standard from the start

```text
Use $professional-code-comments while implementing the task below.
Use the repository's conventions and native API documentation format.
Explain what each meaningful section does and why it is needed, with local
line comments for decisions that need extra explanation. Verify every
claim against the implementation and requirements. Keep documentation
current as you revise the code.

Task: [describe the implementation].
```

### 2. Audit an entire repository without editing

```text
Use $professional-code-comments to audit this entire repository.
Do not edit files. Inventory languages, templates, scripts, configuration,
and schemas. Review every eligible file in batches, keeping a coverage
ledger. Identify misleading or stale comments, missing API contracts,
unexplained sections and decisions, invalid documentation formats, and
operational comment risks. Prioritize by consequence and give concrete
corrections with evidence. Report unknown intent and all exclusions or
remaining work; do not call a sample a complete audit.
```

### 3. Audit and repair comments throughout a repository

```text
Use $professional-code-comments to audit and improve comments and API
documentation across this repository. Preserve executable behaviour and
operational directives. Explain what every meaningful section does and
why, using simple language and each language's correct documentation
format. Keep a coverage ledger and complete all eligible files. Check
callers, tests, and design records before stating intent. Report suspected
code defects separately. Ask one question at a time only when a missing
fact materially changes a correction, giving options and a justified
recommendation; continue independent work.
```

### 4. Maintain comments alongside a functional change

```text
Use $professional-code-comments for this change. Inspect the enclosing
units and affected public contracts, examples, and callers' assumptions.
Update stale parameter names, units, error/cancellation behaviour,
ordering, and rationale along with the implementation. Verify with the
existing tools and report exactly what was checked.

Change: [describe the required behaviour].
```

### 5. Improve C# and .NET documentation

```text
Use $professional-code-comments to improve this C# project's XML docs
and implementation comments. Inspect the target framework, compiler
settings, existing DocFX or other documentation pipeline, and local
style. Check summaries, parameter/type-parameter meanings, returns,
exceptions, remarks, cref/paramref links, escaping, and inherited docs.
Explain meaningful internal sections as well. Preserve behaviour and
warning settings; do not add tooling or alter the build configuration
unless the task requires it. Report unavailable documentation checks.
```

### 6. Document configuration, SQL, and strict data formats

```text
Use $professional-code-comments to clarify the configuration, scripts,
SQL, and schemas in [scope]. Explain units, defaults, ordering, side
effects, failure/recovery assumptions, and supported reasons for unusual
values. Keep strict JSON/CSV valid by using supported schemas or adjacent
field-level documentation. Preserve migration history and directives.
Use local parsing/linting where available; do not operate infrastructure.
```

### 7. Give detailed line-by-line explanations

```text
Use $professional-code-comments to add detailed line-by-line explanations
to [function or file]. Explain each meaningful statement's purpose and
reason in simple terms; group only syntax-only lines such as braces.
Use valid comments for the actual language and embedded regions.
Keep the native API contract as well, avoid invented reasons, and
preserve executable behaviour. Identify any line whose intent cannot
be established from the available evidence.
```

### 8. Investigate lost or conflicting intent

```text
Use $professional-code-comments to investigate the comments and decisions
in [scope]. Compare implementation, callers, tests, current requirements,
and available history. Separate observed behaviour, established intended
policy, demonstrated technical constraints, and unknown reasons. Repair
only explanations supported by evidence. Surface conflicts instead of
making suspected defects sound intentional.
```

### 9. Make the workflow part of a repository's agent instructions

```text
Use $professional-code-comments to adopt its standard for this repository.
Inspect the existing agent/contributor instructions and supported skill
layout. Integrate the supplied repository policy into the appropriate
existing location, keeping one authoritative version and preserving
unrelated rules. Ensure future generation, editing, and audits invoke
this standard. Do not add dependencies or CI gates unless needed for the
requested adoption; propose any optional enforcement separately.
```

### 10. Review a current diff

```text
Use $professional-code-comments to review changes from [base revision].
Check the changed units and documentation affected by their contracts.
Report false or outdated claims, unsupported reasons, missing section
explanations, and tag/directive problems. Keep the review read-only and
state the exact diff scope and any relevant files not reviewed.
```
