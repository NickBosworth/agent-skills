# Desktop refresh

This synthetic source-only WPF excerpt uses the application's existing Windows
build pipeline. Refresh starts on the UI thread. The window owns Status, a WPF
TextBlock. There is no HTTP request scope or database. No Windows/runtime build
is expected on macOS. Examine the operation and report evidence and limitations.
