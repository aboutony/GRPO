// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Models.GrpoDocument
//
// Inbound DTO representing a complete GRPO submission.
// Header-level fields + collection of GrpoLineItem.
// ──────────────────────────────────────────────────────────────────────────────

namespace GrpoAdapter.Models;

/// <summary>
/// Complete GRPO document for submission to SAP B1 via DI API.
/// </summary>
public sealed class GrpoDocument
{
    // ── SAP Base Header Fields ───────────────────────────────────────────────

    /// <summary>Vendor business partner code</summary>
    public required string CardCode { get; init; }

    /// <summary>Document date</summary>
    public required DateTime DocDate { get; init; }

    /// <summary>Tax date (defaults to DocDate if not specified)</summary>
    public DateTime? TaxDate { get; init; }

    /// <summary>Optional document remarks</summary>
    public string? Comments { get; init; }

    // ── Header-Level UDFs (U_GRPO_*) ─────────────────────────────────────────

    /// <summary>SFDA Compliance Submission ID</summary>
    public string? SfdaSubId { get; init; }

    /// <summary>Operator who physically received the goods</summary>
    public string? ReceivedBy { get; init; }

    /// <summary>Quality control gate status (defaults to Pending)</summary>
    public QcStatus QcStatus { get; init; } = QcStatus.Pending;

    // ── Document Lines ───────────────────────────────────────────────────────

    /// <summary>
    /// Line items. Must contain at least one line.
    /// All lines must reference a valid Purchase Order via BaseEntry/BaseLine.
    /// </summary>
    public required List<GrpoLineItem> Lines { get; init; }
}
