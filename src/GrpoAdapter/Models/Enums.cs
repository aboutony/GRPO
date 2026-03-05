// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Models.Enums
//
// C# enums mirroring Sprint 1.1 U_GRPO_ schema definitions.
// These map 1:1 to the ValidValuesMD entries registered on OPDN/PDN1.
// ──────────────────────────────────────────────────────────────────────────────

namespace GrpoAdapter.Models;

/// <summary>
/// Header-level quality control gate status.
/// Maps to: OPDN.U_GRPO_QcStatus (db_Alpha(1), ValidValuesMD: P/A/R)
/// </summary>
public enum QcStatus
{
    /// <summary>Pending inspection</summary>
    Pending = 'P',
    /// <summary>QC approved – cleared for putaway</summary>
    Approved = 'A',
    /// <summary>QC rejected – quarantine required</summary>
    Rejected = 'R'
}

/// <summary>
/// Line-level sterility classification.
/// Maps to: PDN1.U_GRPO_Sterility (db_Alpha(1), ValidValuesMD: S/N/T)
/// </summary>
public enum SterilityType
{
    /// <summary>Product is sterile</summary>
    Sterile = 'S',
    /// <summary>Product is non-sterile</summary>
    NonSterile = 'N',
    /// <summary>Product requires sterilization before use</summary>
    ToSterilize = 'T'
}

/// <summary>
/// Boolean proxy for SAP (no native boolean in DI API UDFs).
/// Maps to: PDN1.U_GRPO_QcReq (db_Alpha(1), ValidValuesMD: Y/N)
/// </summary>
public enum QcRequired
{
    Yes = 'Y',
    No = 'N'
}

/// <summary>
/// Error severity classification for the Sync Engine.
/// Fatal = do not retry, requires human intervention.
/// Retryable = transient failure, safe to retry with backoff.
/// </summary>
public enum ErrorSeverity
{
    /// <summary>Permanent failure – PO closed, invalid UDI, bad batch</summary>
    Fatal,
    /// <summary>Transient failure – timeout, deadlock, session expired</summary>
    Retryable
}
