// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Errors.GrpoPostException
//
// Typed exception carrying SAP error code, description, and severity
// classification for the Sync Engine to act upon.
// ──────────────────────────────────────────────────────────────────────────────

using GrpoAdapter.Models;

namespace GrpoAdapter.Errors;

/// <summary>
/// Exception thrown when a GRPO posting fails at the DI API level.
/// Carries structured error information for the Sync Engine.
/// </summary>
public sealed class GrpoPostException : Exception
{
    /// <summary>SAP error code from Company.GetLastErrorCode()</summary>
    public int SapErrorCode { get; }

    /// <summary>Raw SAP error description from Company.GetLastErrorDescription()</summary>
    public string SapErrorDescription { get; }

    /// <summary>Classified severity: Fatal (do not retry) or Retryable (safe to retry)</summary>
    public ErrorSeverity Severity { get; }

    public GrpoPostException(int sapErrorCode, string sapErrorDescription, ErrorSeverity severity)
        : base($"[{severity}] SAP Error {sapErrorCode}: {sapErrorDescription}")
    {
        SapErrorCode = sapErrorCode;
        SapErrorDescription = sapErrorDescription;
        Severity = severity;
    }

    public GrpoPostException(int sapErrorCode, string sapErrorDescription, ErrorSeverity severity, Exception innerException)
        : base($"[{severity}] SAP Error {sapErrorCode}: {sapErrorDescription}", innerException)
    {
        SapErrorCode = sapErrorCode;
        SapErrorDescription = sapErrorDescription;
        Severity = severity;
    }
}
