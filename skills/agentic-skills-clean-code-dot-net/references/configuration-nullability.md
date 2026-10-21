# Configuration lifetimes and conditional nullable contracts

Load the relevant section for Options configuration or nontrivial nullable helpers.
Sources: [Options](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options),
[nullable attributes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/nullable-analysis).
The [contract fixture](../examples/contracts/Program.cs) executes these distinctions.

## Options

Choose according to the application's existing freshness and failure policy.
Do not add reload behavior or a startup failure as an incidental cleanup.

| Requirement | Choice / check |
| --- | --- |
| Stable cached settings | IOptions; resolving Value is not automatically eager startup validation. |
| Fresh settings per scope | IOptionsSnapshot; scoped lifetime, cached within that scope. Do not capture it in a singleton. |
| Live settings or change notifications | IOptionsMonitor; verify the provider emits change tokens. Reading CurrentValue differs from capturing its initial value. Dispose owned OnChange subscriptions. |
| Required settings must fail before serving work | Use the existing startup-validation mechanism, such as ValidateOnStart, and actually start the host in the test. |
| Cross-property or named configuration | IValidateOptions or an existing validator; preserve named-option selection, Configure/PostConfigure ordering and failure ownership. |

Test initial valid/invalid values, relevant scope boundaries and actual change
notification. Do not simulate reload by merely mutating an object already held by
the consumer. Configuration failures must not expose sensitive values.

## Nullable helpers

First simplify flow or use an accurate signature. An annotation describes actual
behavior; it neither adds a runtime check nor authorizes a public contract change.

| Actual contract | Useful annotation / proof |
| --- | --- |
| A successful Try method provides a non-null output | NotNullWhen(true) on that output; compile a caller that dereferences only on success. |
| Result is non-null whenever a specified input is non-null | NotNullIfNotNull naming that input; test null preservation and a non-null caller. |
| An initialization helper assigns required members before returning | MemberNotNull naming those members; test initialization and compile without suppression. |

For each annotation, verify both runtime behavior and the compiler's analysis of callers. Remove it in an
isolated counterfactual to demonstrate the intended nullable diagnostic; never
add !, fake defaults or disable nullable to make the example compile. Shipped
annotation changes need source-compatibility review, including warning-as-error
consumers. Do not extract methods solely to demonstrate attributes.
