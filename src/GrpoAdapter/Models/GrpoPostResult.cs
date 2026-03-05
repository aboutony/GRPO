// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Models.GrpoPostResult
//
// Outbound result returned from GrpoPostingService.PostAsync().
// Carries either success (DocEntry/DocNum) or failure (error + severity).
// ──────────────────────────────────────────────────────────────────────────────

namespace GrpoAdapter.Models;

/// <summary>
/// Result of a GRPO posting operation.
/// </summary>
public sealed class GrpoPostResult
{
    /// <summary>Whether the document was posted successfully</summary>
    public required bool Success { get; init; }

    /// <summary>SAP DocEntry of the created GRPO (set on success)</summary>
    public int? DocEntry { get; init; }

    /// <summary>SAP DocNum of the created GRPO (set on success)</summary>
    public int? DocNum { get; init; }

    /// <summary>Human-readable error message (set on failure)</summary>
    public string? ErrorMessage { get; init; }

    /// <summary>SAP error code from GetLastErrorCode() (set on failure)</summary>
    public int? SapErrorCode { get; init; }

    /// <summary>Error severity classification for the Sync Engine</summary>
    public ErrorSeverity? ErrorSeverity { get; init; }

    /// <summary>Number of lines in the submitted document</summary>
    public int LineCount { get; init; }

    // ── Factory Methods ──────────────────────────────────────────────────────

    public static GrpoPostResult Ok(int docEntry, int docNum, int lineCount) => new()
    {
        Success = true,
        DocEntry = docEntry,
        DocNum = docNum,
        LineCount = lineCount
    };

    public static GrpoPostResult Fail(string message, int sapErrorCode, ErrorSeverity severity, int lineCount) => new()
    {
        Success = false,
        ErrorMessage = message,
        SapErrorCode = sapErrorCode,
        ErrorSeverity = severity,
        LineCount = lineCount
    };

    public static GrpoPostResult ValidationFail(string message, int lineCount) => new()
    {
        Success = false,
        ErrorMessage = message,
        SapErrorCode = null,
        ErrorSeverity = Models.ErrorSeverity.Fatal,
        LineCount = lineCount
    };
}
