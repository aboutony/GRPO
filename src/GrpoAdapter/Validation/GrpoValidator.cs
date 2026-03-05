// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Validation.GrpoValidator
//
// Pre-flight validation executed BEFORE any DI API interaction.
// Catches bad data early to avoid wasting a SAP transaction.
// ──────────────────────────────────────────────────────────────────────────────

using GrpoAdapter.Models;

namespace GrpoAdapter.Validation;

/// <summary>
/// Result of pre-flight validation.
/// </summary>
public sealed class ValidationResult
{
    public bool IsValid => Errors.Count == 0;
    public List<string> Errors { get; } = [];

    public void AddError(string error) => Errors.Add(error);
    public void AddError(int lineIndex, string error) =>
        Errors.Add($"Line[{lineIndex}]: {error}");
}

/// <summary>
/// Validates a <see cref="GrpoDocument"/> before submission to the DI API.
/// </summary>
public static class GrpoValidator
{
    /// <summary>
    /// Performs comprehensive pre-flight validation on the GRPO document.
    /// </summary>
    public static ValidationResult Validate(GrpoDocument document)
    {
        var result = new ValidationResult();

        // ── Header Validation ────────────────────────────────────────────────

        if (string.IsNullOrWhiteSpace(document.CardCode))
            result.AddError("CardCode (vendor) is required");

        if (document.DocDate == default)
            result.AddError("DocDate is required");

        if (!Enum.IsDefined(document.QcStatus))
            result.AddError($"Invalid QcStatus value: {document.QcStatus}");

        if (document.SfdaSubId is not null && document.SfdaSubId.Length > 30)
            result.AddError($"SfdaSubId exceeds 30 characters (was {document.SfdaSubId.Length})");

        if (document.ReceivedBy is not null && document.ReceivedBy.Length > 50)
            result.AddError($"ReceivedBy exceeds 50 characters (was {document.ReceivedBy.Length})");

        // ── Lines Validation ─────────────────────────────────────────────────

        if (document.Lines is null || document.Lines.Count == 0)
        {
            result.AddError("Document must contain at least one line");
            return result; // No point validating lines if none exist
        }

        for (var i = 0; i < document.Lines.Count; i++)
        {
            var line = document.Lines[i];
            ValidateLine(result, i, line);
        }

        return result;
    }

    private static void ValidateLine(ValidationResult result, int index, GrpoLineItem line)
    {
        // ── Required fields ──────────────────────────────────────────────────

        if (string.IsNullOrWhiteSpace(line.ItemCode))
            result.AddError(index, "ItemCode is required");

        if (line.Quantity <= 0)
            result.AddError(index, $"Quantity must be > 0 (was {line.Quantity})");

        if (string.IsNullOrWhiteSpace(line.WarehouseCode))
            result.AddError(index, "WarehouseCode is required");

        // ── PO Linkage ("The Red Thread") ────────────────────────────────────

        if (line.BaseType != 22)
            result.AddError(index, $"BaseType must be 22 (Purchase Order), was {line.BaseType}");

        if (line.BaseEntry < 0)
            result.AddError(index, $"BaseEntry must be >= 0 (was {line.BaseEntry})");

        if (line.BaseLine < 0)
            result.AddError(index, $"BaseLine must be >= 0 (was {line.BaseLine})");

        // ── Batch Management Enforcement ─────────────────────────────────────

        if (line.IsBatchManaged && string.IsNullOrWhiteSpace(line.BatchNo))
            result.AddError(index, "BatchNo is mandatory for batch-managed items");

        // ── Field Size Constraints ───────────────────────────────────────────

        if (line.UdiDi is not null && line.UdiDi.Length > 50)
            result.AddError(index, $"UdiDi exceeds 50 characters (was {line.UdiDi.Length})");

        if (line.UdiPi is not null && line.UdiPi.Length > 50)
            result.AddError(index, $"UdiPi exceeds 50 characters (was {line.UdiPi.Length})");

        if (line.BatchNo is not null && line.BatchNo.Length > 30)
            result.AddError(index, $"BatchNo exceeds 30 characters (was {line.BatchNo.Length})");

        // ── Enum Validity ────────────────────────────────────────────────────

        if (!Enum.IsDefined(line.Sterility))
            result.AddError(index, $"Invalid Sterility value: {line.Sterility}");

        if (!Enum.IsDefined(line.QcReq))
            result.AddError(index, $"Invalid QcReq value: {line.QcReq}");

        // ── UDI Format (basic GS1 sanity check) ─────────────────────────────

        if (line.UdiDi is not null && !IsValidUdiDiFormat(line.UdiDi))
            result.AddError(index, $"UdiDi does not appear to be a valid GS1 DI: '{line.UdiDi}'");
    }

    /// <summary>
    /// Basic GS1 UDI-DI format check. A proper DI should start with a recognized
    /// Application Identifier prefix (01) and contain 14+ characters.
    /// This is a sanity check, not full GS1 validation.
    /// </summary>
    private static bool IsValidUdiDiFormat(string udiDi)
    {
        if (string.IsNullOrWhiteSpace(udiDi)) return false;

        // Accept raw GTIN (14 digits) or AI-prefixed (01)XXXXXXXXXXXXXX
        var cleaned = udiDi.Trim();
        if (cleaned.Length >= 14) return true;

        // Also accept short-form device identifiers used in some regulatory regimes
        if (cleaned.Length >= 8) return true;

        return false;
    }
}
