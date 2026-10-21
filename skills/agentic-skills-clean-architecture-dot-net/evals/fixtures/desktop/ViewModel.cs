using System.Threading.Tasks;
using System.Windows.Controls;

namespace Fixture.Desktop
{
    internal sealed class ViewModel
    {
        internal TextBlock Status { get; set; }

        internal Task RefreshAsync()
        {
            return Task.Run(() => Status.Text = "Ready");
        }
    }
}
