namespace Fixture.Api;

internal sealed class ReservationEndpoint
{
    /// <summary>Checks the API admission contract without modifying storage.</summary>
    /// <param name="tenant">Only tenant-a is authorized in this synthetic fixture.</param>
    /// <param name="available">Snapshot of available places.</param>
    /// <param name="requested">Requested places; nonpositive values are invalid.</param>
    /// <param name="cancellationToken">Observed before validation.</param>
    /// <returns>denied, invalid, accepted or full in validation order.</returns>
    /// <exception cref="OperationCanceledException">The token is already cancelled.</exception>
    public string Reserve(string tenant, int available, int requested, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (tenant != "tenant-a")
        {
            return "denied";
        }
        if (requested <= 0)
        {
            return "invalid";
        }
        return available >= requested ? "accepted" : "full";
    }
}
