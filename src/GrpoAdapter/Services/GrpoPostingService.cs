// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Services.GrpoPostingService
//
// Main orchestrator for GRPO document posting.
// Flow: Validate → CircuitBreaker.Execute( StartTx → Map → Add → Commit/Rollback )
//
// Guarantees: A 100-line GRPO either posts 100% or fails entirely.
// ──────────────────────────────────────────────────────────────────────────────

using SAPbobsCOM;
using Microsoft.Extensions.Logging;
using GrpoAdapter.Connection;
using GrpoAdapter.Errors;
using GrpoAdapter.Mapping;
using GrpoAdapter.Models;
using GrpoAdapter.Resilience;
using GrpoAdapter.Validation;

namespace GrpoAdapter.Services;

/// <summary>
/// Orchestrates atomic GRPO document posting to SAP B1 via DI API.
/// </summary>
public sealed class GrpoPostingService
{
    private readonly SapConnectionManager _connection;
    private readonly GrpoDocumentMapper _mapper;
    private readonly SapCircuitBreaker _circuitBreaker;
    private readonly ILogger<GrpoPostingService> _logger;

    public GrpoPostingService(
        SapConnectionManager connection,
        GrpoDocumentMapper mapper,
        SapCircuitBreaker circuitBreaker,
        ILogger<GrpoPostingService> logger)
    {
        _connection = connection ?? throw new ArgumentNullException(nameof(connection));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _circuitBreaker = circuitBreaker ?? throw new ArgumentNullException(nameof(circuitBreaker));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Posts a GRPO document to SAP B1 with full atomic transaction enforcement.
    /// </summary>
    /// <param name="document">The GRPO document to post</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>
    /// <see cref="GrpoPostResult"/> with DocEntry/DocNum on success,
    /// or error details with severity classification on failure.
    /// </returns>
    public async Task<GrpoPostResult> PostAsync(
        GrpoDocument document,
        CancellationToken cancellationToken = default)
    {
        var lineCount = document.Lines?.Count ?? 0;

        _logger.LogInformation(
            "GRPO posting initiated: {CardCode}, {LineCount} lines, QcStatus={QcStatus}",
            document.CardCode, lineCount, document.QcStatus);

        // ── Step 1: Pre-flight Validation ────────────────────────────────────
        // Catches bad data BEFORE wasting a SAP transaction.

        var validation = GrpoValidator.Validate(document);
        if (!validation.IsValid)
        {
            var errors = string.Join("; ", validation.Errors);
            _logger.LogWarning("GRPO validation failed: {Errors}", errors);
            return GrpoPostResult.ValidationFail(
                $"Pre-flight validation failed: {errors}", lineCount);
        }

        _logger.LogDebug("Pre-flight validation passed for {LineCount} lines", lineCount);

        // ── Step 2: Execute through Circuit Breaker ──────────────────────────
        // Retryable errors get exponential backoff; Fatal errors propagate.

        return await _circuitBreaker.ExecuteAsync(async (ct) =>
        {
            return await Task.FromResult(ExecuteAtomicPost(document));
        }, cancellationToken);
    }

    /// <summary>
    /// Core atomic posting logic wrapped in Company.StartTransaction().
    /// If Add() returns non-zero, rolls back — zero partial data enters SAP.
    /// </summary>
    private GrpoPostResult ExecuteAtomicPost(GrpoDocument document)
    {
        var lineCount = document.Lines.Count;

        // Ensure connection is live
        if (!_connection.IsConnected)
            _connection.Connect();

        Documents? sapDoc = null;

        try
        {
            // ── Start Atomic Transaction ─────────────────────────────────────
            _connection.StartTransaction();

            // ── Get PurchaseDeliveryNotes object ─────────────────────────────
            sapDoc = (Documents)_connection.Company.GetBusinessObject(
                BoObjectTypes.oPurchaseDeliveryNotes);

            // ── Map DTO → SAP Document ───────────────────────────────────────
            _mapper.Map(document, sapDoc);

            // ── Attempt Add ──────────────────────────────────────────────────
            var result = sapDoc.Add();

            if (result != 0)
            {
                // ── ROLLBACK — no partial data enters SAP ────────────────────
                var (errCode, errMsg) = _connection.GetLastError();
                _connection.Rollback();

                var severity = SapErrorClassifier.Classify(errCode, errMsg);

                _logger.LogError(
                    "GRPO post FAILED [{Severity}] — SAP Error {Code}: {Message}. " +
                    "Transaction rolled back. {LineCount} lines affected.",
                    severity, errCode, errMsg, lineCount);

                throw new GrpoPostException(errCode, errMsg, severity);
            }

            // ── COMMIT — all lines posted successfully ───────────────────────
            _connection.Commit();

            // Retrieve the created DocEntry
            var newKey = _connection.Company.GetNewObjectKey();
            var docEntry = int.Parse(newKey);

            // Fetch DocNum for the response
            var docNum = GetDocNum(sapDoc, docEntry);

            _logger.LogInformation(
                "GRPO posted successfully: DocEntry={DocEntry}, DocNum={DocNum}, Lines={LineCount}",
                docEntry, docNum, lineCount);

            return GrpoPostResult.Ok(docEntry, docNum, lineCount);
        }
        catch (GrpoPostException)
        {
            // Already rolled back, re-throw for circuit breaker evaluation
            throw;
        }
        catch (Exception ex)
        {
            // ── Unexpected error — rollback and classify ──────────────────────
            _connection.Rollback();

            var severity = SapErrorClassifier.ClassifyException(ex);

            _logger.LogError(ex,
                "GRPO post FAILED [{Severity}] — Unexpected: {Message}. " +
                "Transaction rolled back. {LineCount} lines affected.",
                severity, ex.Message, lineCount);

            throw new GrpoPostException(0, ex.Message, severity, ex);
        }
        finally
        {
            // ── Release COM object ───────────────────────────────────────────
            if (sapDoc is not null)
                System.Runtime.InteropServices.Marshal.ReleaseComObject(sapDoc);
        }
    }

    /// <summary>
    /// Retrieves the DocNum for a posted document by re-fetching via DocEntry.
    /// </summary>
    private int GetDocNum(Documents sapDoc, int docEntry)
    {
        try
        {
            if (sapDoc.GetByKey(docEntry))
                return sapDoc.DocNum;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not retrieve DocNum for DocEntry {DocEntry}", docEntry);
        }

        return 0;
    }
}
