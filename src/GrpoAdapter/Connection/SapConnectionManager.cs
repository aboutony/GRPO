// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Connection.SapConnectionManager
//
// Manages the SAPbobsCOM.Company object lifecycle.
// Implements IDisposable for deterministic COM cleanup.
// ──────────────────────────────────────────────────────────────────────────────

using SAPbobsCOM;
using Microsoft.Extensions.Logging;

namespace GrpoAdapter.Connection;

/// <summary>
/// Configuration for SAP B1 DI API connection.
/// </summary>
public sealed record SapConnectionConfig
{
    public required string Server { get; init; }
    public required string CompanyDb { get; init; }
    public required string Username { get; init; }
    public required string Password { get; init; }
    public required string LicenseServer { get; init; }
    public BoSuppLangs Language { get; init; } = BoSuppLangs.ln_English;
    public BoDataServerTypes DbType { get; init; } = BoDataServerTypes.dst_MSSQL2019;
}

/// <summary>
/// Manages SAP B1 DI API Company object lifecycle and transaction control.
/// Thread-affine: each instance should be used by a single thread.
/// </summary>
public sealed class SapConnectionManager : IDisposable
{
    private readonly SapConnectionConfig _config;
    private readonly ILogger<SapConnectionManager> _logger;
    private Company? _company;
    private bool _disposed;

    public SapConnectionManager(SapConnectionConfig config, ILogger<SapConnectionManager> logger)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets the connected Company object. Throws if not connected.
    /// </summary>
    public Company Company => _company ?? throw new InvalidOperationException(
        "SAP connection not established. Call Connect() first.");

    /// <summary>
    /// Whether a live connection to SAP is established.
    /// </summary>
    public bool IsConnected => _company?.Connected == true;

    /// <summary>
    /// Establishes a connection to SAP B1 via DI API.
    /// </summary>
    public void Connect()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        if (IsConnected)
        {
            _logger.LogDebug("SAP connection already established, reusing");
            return;
        }

        _company = new Company
        {
            Server = _config.Server,
            CompanyDB = _config.CompanyDb,
            UserName = _config.Username,
            Password = _config.Password,
            LicenseServer = _config.LicenseServer,
            language = _config.Language,
            DbServerType = _config.DbType,
            UseTrusted = false
        };

        var result = _company.Connect();
        if (result != 0)
        {
            var errCode = _company.GetLastErrorCode();
            var errMsg = _company.GetLastErrorDescription();
            _company = null;
            throw new InvalidOperationException(
                $"SAP DI API connection failed [{errCode}]: {errMsg}");
        }

        _logger.LogInformation("SAP DI API connected to {CompanyDb} on {Server}",
            _config.CompanyDb, _config.Server);
    }

    /// <summary>
    /// Starts an atomic transaction. Must be followed by Commit() or Rollback().
    /// </summary>
    public void StartTransaction()
    {
        if (Company.InTransaction)
        {
            _logger.LogWarning("Transaction already active — skipping StartTransaction()");
            return;
        }

        Company.StartTransaction();
        _logger.LogDebug("SAP transaction started");
    }

    /// <summary>
    /// Commits the active transaction.
    /// </summary>
    public void Commit()
    {
        if (!Company.InTransaction)
        {
            _logger.LogWarning("No active transaction to commit");
            return;
        }

        Company.EndTransaction(BoWfTransOpt.wf_Commit);
        _logger.LogDebug("SAP transaction committed");
    }

    /// <summary>
    /// Rolls back the active transaction — no partial data enters SAP.
    /// </summary>
    public void Rollback()
    {
        if (!Company.InTransaction)
        {
            _logger.LogWarning("No active transaction to roll back");
            return;
        }

        Company.EndTransaction(BoWfTransOpt.wf_RollBack);
        _logger.LogWarning("SAP transaction rolled back");
    }

    /// <summary>
    /// Retrieves the last SAP error as a tuple of (code, message).
    /// </summary>
    public (int Code, string Message) GetLastError()
    {
        if (_company is null) return (0, "No company object");
        return (_company.GetLastErrorCode(), _company.GetLastErrorDescription());
    }

    /// <summary>
    /// Disconnects and releases the COM Company object.
    /// </summary>
    public void Disconnect()
    {
        if (_company?.Connected == true)
        {
            if (_company.InTransaction)
            {
                _logger.LogWarning("Forcing rollback of active transaction during disconnect");
                _company.EndTransaction(BoWfTransOpt.wf_RollBack);
            }

            _company.Disconnect();
            _logger.LogInformation("SAP DI API disconnected");
        }

        if (_company is not null)
        {
            System.Runtime.InteropServices.Marshal.ReleaseComObject(_company);
            _company = null;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        Disconnect();
        _disposed = true;
    }
}
