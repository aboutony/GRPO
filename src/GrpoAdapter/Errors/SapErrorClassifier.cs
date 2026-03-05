// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Errors.SapErrorClassifier
//
// Classifies SAP DI API error messages into Fatal vs Retryable categories.
// Fatal = permanent failure, requires human intervention or data correction.
// Retryable = transient failure, safe to retry with exponential backoff.
// ──────────────────────────────────────────────────────────────────────────────

using System.Text.RegularExpressions;
using GrpoAdapter.Models;

namespace GrpoAdapter.Errors;

/// <summary>
/// Classifies SAP B1 DI API errors into <see cref="ErrorSeverity"/> levels.
/// </summary>
public static partial class SapErrorClassifier
{
    // ── Fatal Patterns ───────────────────────────────────────────────────────
    // These indicate permanent business logic or data quality failures.
    // Retrying will not resolve them — requires human intervention.

    private static readonly Regex[] FatalPatterns =
    [
        FatalPoClosed(),
        FatalPoFullyReceived(),
        FatalInvalidUdi(),
        FatalBatchMandatory(),
        FatalBatchNotFound(),
        FatalItemNotFound(),
        FatalWarehouseNotFound(),
        FatalQuantityExceeded(),
        FatalVendorInactive(),
        FatalDocumentCancelled(),
    ];

    // ── Retryable Patterns ───────────────────────────────────────────────────
    // These indicate transient infrastructure or concurrency issues.
    // Safe to retry after backoff.

    private static readonly Regex[] RetryablePatterns =
    [
        RetryableTimeout(),
        RetryableDeadlock(),
        RetryableLockTimeout(),
        RetryableSessionExpired(),
        RetryableLoginFailed(),
        RetryableConnectionReset(),
        RetryableNetworkError(),
    ];

    /// <summary>
    /// Classifies a SAP error message and code into a severity level.
    /// </summary>
    /// <param name="errorCode">SAP error code from Company.GetLastErrorCode()</param>
    /// <param name="errorMessage">SAP error description from Company.GetLastErrorDescription()</param>
    /// <returns>
    /// <see cref="ErrorSeverity.Retryable"/> if the error matches a transient pattern;
    /// <see cref="ErrorSeverity.Fatal"/> otherwise (default-safe: assume non-retryable).
    /// </returns>
    public static ErrorSeverity Classify(int errorCode, string errorMessage)
    {
        if (string.IsNullOrWhiteSpace(errorMessage))
            return ErrorSeverity.Fatal;

        // Check retryable first — if it matches, we can retry
        foreach (var pattern in RetryablePatterns)
        {
            if (pattern.IsMatch(errorMessage))
                return ErrorSeverity.Retryable;
        }

        // Check fatal patterns for explicit match (informational — still fatal)
        foreach (var pattern in FatalPatterns)
        {
            if (pattern.IsMatch(errorMessage))
                return ErrorSeverity.Fatal;
        }

        // Default: treat unknown errors as Fatal (safe default — no blind retries)
        return ErrorSeverity.Fatal;
    }

    /// <summary>
    /// Determines if a .NET exception represents a retryable condition.
    /// Used by the circuit breaker to decide whether to retry.
    /// </summary>
    public static ErrorSeverity ClassifyException(Exception ex)
    {
        return ex switch
        {
            GrpoPostException gpe => gpe.Severity,
            TimeoutException => ErrorSeverity.Retryable,
            System.Net.Sockets.SocketException => ErrorSeverity.Retryable,
            System.Runtime.InteropServices.COMException comEx =>
                Classify(comEx.ErrorCode, comEx.Message),
            _ => ErrorSeverity.Fatal
        };
    }

    // ── Source-Generated Regex Patterns ───────────────────────────────────────

    // Fatal patterns
    [GeneratedRegex(@"(PO|purchase\s+order)\s+(is\s+)?closed", RegexOptions.IgnoreCase)]
    private static partial Regex FatalPoClosed();

    [GeneratedRegex(@"(already\s+been\s+)?fully\s+received", RegexOptions.IgnoreCase)]
    private static partial Regex FatalPoFullyReceived();

    [GeneratedRegex(@"(invalid|malformed)\s+UDI", RegexOptions.IgnoreCase)]
    private static partial Regex FatalInvalidUdi();

    [GeneratedRegex(@"batch\s+(is\s+)?mandatory", RegexOptions.IgnoreCase)]
    private static partial Regex FatalBatchMandatory();

    [GeneratedRegex(@"batch\s*.*\s*not\s+found", RegexOptions.IgnoreCase)]
    private static partial Regex FatalBatchNotFound();

    [GeneratedRegex(@"item\s*.*\s*(not\s+found|does\s+not\s+exist)", RegexOptions.IgnoreCase)]
    private static partial Regex FatalItemNotFound();

    [GeneratedRegex(@"warehouse\s*.*\s*(not\s+found|does\s+not\s+exist)", RegexOptions.IgnoreCase)]
    private static partial Regex FatalWarehouseNotFound();

    [GeneratedRegex(@"(quantity|qty)\s*(exceeds|greater\s+than|over)", RegexOptions.IgnoreCase)]
    private static partial Regex FatalQuantityExceeded();

    [GeneratedRegex(@"(vendor|business\s+partner|BP)\s*(is\s+)?(inactive|frozen|blocked)", RegexOptions.IgnoreCase)]
    private static partial Regex FatalVendorInactive();

    [GeneratedRegex(@"document\s*(has\s+been\s+)?cancel", RegexOptions.IgnoreCase)]
    private static partial Regex FatalDocumentCancelled();

    // Retryable patterns
    [GeneratedRegex(@"time\s*out|timed?\s+out", RegexOptions.IgnoreCase)]
    private static partial Regex RetryableTimeout();

    [GeneratedRegex(@"deadlock", RegexOptions.IgnoreCase)]
    private static partial Regex RetryableDeadlock();

    [GeneratedRegex(@"lock\s+time\s*out", RegexOptions.IgnoreCase)]
    private static partial Regex RetryableLockTimeout();

    [GeneratedRegex(@"session\s*(has\s+)?expired", RegexOptions.IgnoreCase)]
    private static partial Regex RetryableSessionExpired();

    [GeneratedRegex(@"login\s+failed|authentication\s+failed", RegexOptions.IgnoreCase)]
    private static partial Regex RetryableLoginFailed();

    [GeneratedRegex(@"connection\s*(was\s+)?reset|connection\s+refused", RegexOptions.IgnoreCase)]
    private static partial Regex RetryableConnectionReset();

    [GeneratedRegex(@"network\s+error|unable\s+to\s+connect", RegexOptions.IgnoreCase)]
    private static partial Regex RetryableNetworkError();
}
