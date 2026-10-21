using Fixture.Api;
using Fixture.Worker;

namespace Fixture.Host;

internal static class Composition
{
    public static (ReservationEndpoint Api, ReservationJob Worker) Create() =>
        (new ReservationEndpoint(), new ReservationJob());
}
