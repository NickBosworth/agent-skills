using System.Runtime.CompilerServices;

namespace CleanCode.Examples;

/// <summary>Describes a receipt's delivery state.</summary>
public enum DeliveryState
{
    /// <summary>No receipt has been committed.</summary>
    Pending,
    /// <summary>The destination confirmed the commit.</summary>
    Committed
}

/// <summary>Receives notification of a confirmed delivery.</summary>
/// <param name="state">The confirmed delivery state.</param>
public delegate void DeliveryNotification(DeliveryState state);

/// <summary>Represents a value snapshot of receipt text, without deep-copy guarantees.</summary>
/// <param name="Text">Receipt content; may be null for an absent receipt.</param>
public sealed record ReceiptSnapshot(string? Text);

/// <summary>Exposes a caller-supplied receipt without modifying it.</summary>
/// <param name="text">Content retained exactly, including null.</param>
public sealed class ReceiptView(string? text)
{
    /// <summary>Gets the borrowed receipt text.</summary>
    /// <value>The original text, or null if absent.</value>
    public string? Text { get; } = text;

    /// <summary>Gets a character from the receipt.</summary>
    /// <param name="index">Zero-based character position.</param>
    /// <returns>The character at the requested position.</returns>
    /// <exception cref="InvalidOperationException">Receipt text is absent.</exception>
    /// <exception cref="IndexOutOfRangeException">The position is outside the receipt.</exception>
    public char this[int index] => (Text ?? throw new InvalidOperationException("Receipt absent."))[index];

    /// <summary>Occurs when the caller explicitly confirms a delivery.</summary>
    /// <remarks>This instance supplies no thread-safety or duplicate-notification guarantee.</remarks>
    public event DeliveryNotification? Committed;

    /// <summary>Notifies current subscribers that delivery was confirmed.</summary>
    public void Confirm()
    {
        Committed?.Invoke(DeliveryState.Committed);
    }

    /// <inheritdoc/>
    /// <remarks>Absent receipt text is represented by an empty display string.</remarks>
    public override string ToString() => Text ?? string.Empty;
}

/// <summary>Provides small collection contracts for documentation examples.</summary>
public static class ReceiptCollections
{
    /// <summary>Finds the first matching item without cloning it.</summary>
    /// <typeparam name="TItem">A reference type stored in the source.</typeparam>
    /// <param name="items">Source enumerated once; must not be null.</param>
    /// <param name="matches">Predicate applied in source order; must not be null.</param>
    /// <returns>The first matching item, or null when there is no match.</returns>
    /// <exception cref="ArgumentNullException">An input is null.</exception>
    /// <remarks>Unlike <see cref="Enumerable.ToList{TSource}(IEnumerable{TSource})"/>, this does not create a snapshot.</remarks>
    public static TItem? Find<TItem>(IEnumerable<TItem> items, Func<TItem, bool> matches)
        where TItem : class
    {
        ArgumentNullException.ThrowIfNull(items);
        ArgumentNullException.ThrowIfNull(matches);
        foreach (TItem item in items)
        {
            if (matches(item))
            {
                return item;
            }
        }

        return null;
    }

    /// <summary>Yields caller-owned receipt views in source order.</summary>
    /// <param name="items">Borrowed views; validated when enumeration begins.</param>
    /// <param name="cancellationToken">Forwarded to source enumeration and checked before each yield.</param>
    /// <returns>A deferred stream; no views are cloned or disposed.</returns>
    /// <exception cref="ArgumentNullException">The source is null, observed during enumeration.</exception>
    /// <exception cref="OperationCanceledException">Cancellation is observed during enumeration.</exception>
    public static async IAsyncEnumerable<ReceiptView> StreamAsync(
        IAsyncEnumerable<ReceiptView> items,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(items);
        await foreach (ReceiptView item in items.WithCancellation(cancellationToken).ConfigureAwait(false))
        {
            cancellationToken.ThrowIfCancellationRequested();
            yield return item;
        }
    }
}

/// <summary>Implements the sink contract without retaining receipt data.</summary>
public sealed class DiscardingSink : IReceiptSink
{
    /// <inheritdoc/>
    public async Task CommitAsync(Stream receipt, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(receipt);
        await receipt.CopyToAsync(Stream.Null, cancellationToken).ConfigureAwait(false);
    }
}
