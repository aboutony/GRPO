// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Models.GrpoLineItem
//
// Line-level DTO carrying PO linkage ("The Red Thread"), UDI scan data,
// and medical device classification fields.
// ──────────────────────────────────────────────────────────────────────────────

namespace GrpoAdapter.Models;

/// <summary>
/// Represents a single GRPO line item with PO linkage and medical device metadata.
/// </summary>
public sealed class GrpoLineItem
{
    // ── SAP Base Fields ──────────────────────────────────────────────────────

    /// <summary>SAP item code</summary>
    public required string ItemCode { get; init; }

    /// <summary>Received quantity</summary>
    public required double Quantity { get; init; }

    /// <summary>Target warehouse code</summary>
    public required string WarehouseCode { get; init; }

    // ── PO Linkage ("The Red Thread") ────────────────────────────────────────

    /// <summary>Base document type. Always 22 (Purchase Order) for GRPO.</summary>
    public int BaseType { get; init; } = 22;

    /// <summary>Source Purchase Order DocEntry</summary>
    public required int BaseEntry { get; init; }

    /// <summary>Source Purchase Order line number</summary>
    public required int BaseLine { get; init; }

    // ── Medical Device UDFs (U_GRPO_*) ───────────────────────────────────────

    /// <summary>GS1-compliant Unique Device Identifier – Device Identifier</summary>
    public string? UdiDi { get; init; }

    /// <summary>UDI Production Identifier (Batch/Serial/Expiry composite)</summary>
    public string? UdiPi { get; init; }

    /// <summary>Manufacturer batch/lot number</summary>
    public string? BatchNo { get; init; }

    /// <summary>Product expiry date for FEFO enforcement</summary>
    public DateTime? Expiry { get; init; }

    /// <summary>Sterility classification</summary>
    public SterilityType Sterility { get; init; } = SterilityType.NonSterile;

    /// <summary>Whether this line triggers the automated quarantine workflow</summary>
    public QcRequired QcReq { get; init; } = QcRequired.No;

    // ── Batch Management Flag ────────────────────────────────────────────────

    /// <summary>
    /// Set to true if the item master has BatchManagement enabled.
    /// When true, BatchNo becomes mandatory and batch sub-lines are created.
    /// </summary>
    public bool IsBatchManaged { get; init; }
}
