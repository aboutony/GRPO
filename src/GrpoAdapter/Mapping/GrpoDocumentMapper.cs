// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Mapping.GrpoDocumentMapper
//
// Maps GrpoDocument DTO → SAPbobsCOM.Documents (PurchaseDeliveryNotes).
// All U_GRPO_ fields are set via UserFields.Fields.Item().
// ──────────────────────────────────────────────────────────────────────────────

using SAPbobsCOM;
using GrpoAdapter.Models;
using Microsoft.Extensions.Logging;

namespace GrpoAdapter.Mapping;

/// <summary>
/// Maps <see cref="GrpoDocument"/> DTOs to SAP B1 DI API PurchaseDeliveryNotes objects.
/// </summary>
public sealed class GrpoDocumentMapper
{
    private readonly ILogger<GrpoDocumentMapper> _logger;

    public GrpoDocumentMapper(ILogger<GrpoDocumentMapper> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Maps the DTO to a SAP B1 PurchaseDeliveryNotes document object.
    /// The caller is responsible for calling <c>doc.Add()</c> after mapping.
    /// </summary>
    public void Map(GrpoDocument source, Documents target)
    {
        // ── Header ───────────────────────────────────────────────────────────

        target.DocObjectCode = BoObjectTypes.oPurchaseDeliveryNotes;
        target.CardCode = source.CardCode;
        target.DocDate = source.DocDate;
        target.TaxDate = source.TaxDate ?? source.DocDate;

        if (source.Comments is not null)
            target.Comments = source.Comments;

        // ── Header UDFs ──────────────────────────────────────────────────────

        SetUserField(target.UserFields, "U_GRPO_QcStatus", ((char)source.QcStatus).ToString());

        if (source.SfdaSubId is not null)
            SetUserField(target.UserFields, "U_GRPO_SfdaSubId", source.SfdaSubId);

        if (source.ReceivedBy is not null)
            SetUserField(target.UserFields, "U_GRPO_ReceivedBy", source.ReceivedBy);

        // ── Lines ────────────────────────────────────────────────────────────

        for (var i = 0; i < source.Lines.Count; i++)
        {
            if (i > 0) target.Lines.Add();

            var srcLine = source.Lines[i];
            MapLine(srcLine, target.Lines, i);
        }

        _logger.LogDebug("Mapped GRPO document: {CardCode}, {LineCount} lines",
            source.CardCode, source.Lines.Count);
    }

    private void MapLine(GrpoLineItem source, Document_Lines target, int index)
    {
        // ── SAP Base Fields ──────────────────────────────────────────────────

        target.ItemCode = source.ItemCode;
        target.Quantity = source.Quantity;
        target.WarehouseCode = source.WarehouseCode;

        // ── PO Linkage ("The Red Thread") ────────────────────────────────────
        // BaseType = 22 (Purchase Order). SAP auto-decrements OpenQty.

        target.BaseType = source.BaseType;
        target.BaseEntry = source.BaseEntry;
        target.BaseLine = source.BaseLine;

        // ── Line-Level UDFs ──────────────────────────────────────────────────

        if (source.UdiDi is not null)
            SetUserField(target.UserFields, "U_GRPO_UdiDi", source.UdiDi);

        if (source.UdiPi is not null)
            SetUserField(target.UserFields, "U_GRPO_UdiPi", source.UdiPi);

        if (source.BatchNo is not null)
            SetUserField(target.UserFields, "U_GRPO_BatchNo", source.BatchNo);

        if (source.Expiry.HasValue)
            SetUserField(target.UserFields, "U_GRPO_Expiry", source.Expiry.Value);

        SetUserField(target.UserFields, "U_GRPO_Sterility", ((char)source.Sterility).ToString());
        SetUserField(target.UserFields, "U_GRPO_QcReq", ((char)source.QcReq).ToString());

        // ── Batch Sub-Lines (when BatchManagement is enabled) ────────────────

        if (source.IsBatchManaged && !string.IsNullOrWhiteSpace(source.BatchNo))
        {
            target.BatchNumbers.BatchNumber = source.BatchNo;
            target.BatchNumbers.Quantity = source.Quantity;

            if (source.Expiry.HasValue)
                target.BatchNumbers.ExpiryDate = source.Expiry.Value;

            _logger.LogDebug("Line[{Index}]: Batch sub-line created for {BatchNo} (qty: {Qty})",
                index, source.BatchNo, source.Quantity);
        }
    }

    // ── UserFields Helpers ───────────────────────────────────────────────────

    private static void SetUserField(UserFields fields, string fieldName, string value)
    {
        fields.Fields.Item(fieldName).Value = value;
    }

    private static void SetUserField(UserFields fields, string fieldName, DateTime value)
    {
        fields.Fields.Item(fieldName).Value = value;
    }
}
