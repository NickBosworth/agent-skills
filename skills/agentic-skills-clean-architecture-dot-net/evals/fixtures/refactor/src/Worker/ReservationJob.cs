namespace Fixture.Worker;

internal sealed class ReservationJob
{
    /// <summary>Checks job admission without modifying storage.</summary>
    /// <param name="tenant">Only tenant-a is authorized in this synthetic fixture.</param>
    /// <param name="available">Snapshot of available places.</param>
    /// <param name="requested">Requested places; nonpositive values are rejected.</param>
    /// <param name="cancellationToken">Observed before validation.</param>
    /// <returns>True only for an authorized positive request with enough capacity.</returns>
    /// <exception cref="OperationCanceledException">The token is already cancelled.</exception>
    public bool Execute(string tenant, int available, int requested, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (tenant != "tenant-a" || requested <= 0)
        {
            return false;
        }
        return available >= requested;
    }
}
