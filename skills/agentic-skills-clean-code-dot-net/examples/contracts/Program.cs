using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

Check(new NullableContracts().Label == "synthetic", "Initialized member contract.");
Check(NullableContracts.TryLabel("receipt", out var label) && label.Length == 7, "Successful Try contract.");
Check(!NullableContracts.TryLabel(null, out var absent) && absent is null, "Unsuccessful Try contract.");
Check(NullableContracts.Preserve("receipt").Length == 7, "Conditional result contract.");
Check(NullableContracts.Preserve(null) is null, "Null result contract.");

using var host = CreateHost("3");
await host.StartAsync();
var configuration = host.Services.GetRequiredService<IConfiguration>();
var stable = host.Services.GetRequiredService<IOptions<ReceiptOptions>>();
var monitor = host.Services.GetRequiredService<IOptionsMonitor<ReceiptOptions>>();
using var firstScope = host.Services.CreateScope();
var snapshot = firstScope.ServiceProvider.GetRequiredService<IOptionsSnapshot<ReceiptOptions>>();
Check(stable.Value.Limit == 3 && snapshot.Value.Limit == 3 && monitor.CurrentValue.Limit == 3, "Initial settings.");
var unrelated = host.Services.GetRequiredService<IOptionsFactory<ReceiptOptions>>().Create("Unrelated");
Check(unrelated.Limit == 0 && unrelated.Maximum == 0, "Default-only validator skips unrelated names.");
var notifications = 0;
using (monitor.OnChange(_ => notifications++))
{
    configuration["Receipt:Limit"] = "7";
    ((IConfigurationRoot)configuration).Reload();
    Check(notifications > 0 && monitor.CurrentValue.Limit == 7, "Provider-driven monitor update.");
    Check(stable.Value.Limit == 3 && snapshot.Value.Limit == 3, "Cached settings and existing scope.");
    using var nextScope = host.Services.CreateScope();
    Check(nextScope.ServiceProvider.GetRequiredService<IOptionsSnapshot<ReceiptOptions>>().Value.Limit == 7, "New scope settings.");
}
var before = notifications;
configuration["Receipt:Limit"] = "9";
((IConfigurationRoot)configuration).Reload();
Check(notifications == before && monitor.CurrentValue.Limit == 9, "Disposed subscription.");
await host.StopAsync();

using var invalid = CreateHost("0");
try
{
    await invalid.StartAsync();
    throw new InvalidOperationException("Invalid startup settings were accepted.");
}
catch (OptionsValidationException)
{
    // The host failed before serving work, without waiting for a consumer access.
}
using var inconsistent = CreateHost("3", "2");
try
{
    await inconsistent.StartAsync();
    throw new InvalidOperationException("Inconsistent startup settings were accepted.");
}
catch (OptionsValidationException)
{
    // Individually positive settings must still satisfy the cross-property contract.
}
using var deferred = CreateHost("0", validateOnStart: false);
await deferred.StartAsync();
try
{
    _ = deferred.Services.GetRequiredService<IOptions<ReceiptOptions>>().Value;
    throw new InvalidOperationException("Deferred validation did not run on access.");
}
catch (OptionsValidationException)
{
    // This host deliberately retains validation at first use rather than startup.
}
await deferred.StopAsync();
Console.WriteLine("PASS: 14 contract checks.");

static IHost CreateHost(string limit, string maximum = "10", bool validateOnStart = true)
{
    var builder = Host.CreateApplicationBuilder();
    builder.Logging.ClearProviders();
    builder.Configuration.Sources.Clear();
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["Receipt:Limit"] = limit,
        ["Receipt:Maximum"] = maximum
    });
    var options = builder.Services.AddOptions<ReceiptOptions>().Bind(builder.Configuration.GetSection("Receipt"));
    builder.Services.AddSingleton<IValidateOptions<ReceiptOptions>, ReceiptOptionsValidator>();
    if (validateOnStart)
    {
        options.ValidateOnStart();
    }
    return builder.Build();
}

static void Check(bool condition, string contract)
{
    if (!condition)
    {
        throw new InvalidOperationException(contract);
    }
}

internal sealed class ReceiptOptions
{
    public int Limit { get; set; }

    public int Maximum { get; set; }
}

internal sealed class ReceiptOptionsValidator : IValidateOptions<ReceiptOptions>
{
    public ValidateOptionsResult Validate(string? name, ReceiptOptions options)
    {
        if (name is not null && name != Options.DefaultName)
        {
            return ValidateOptionsResult.Skip;
        }
        return options.Limit > 0 && options.Maximum >= options.Limit
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail("Limits must be positive and ordered.");
    }
}
