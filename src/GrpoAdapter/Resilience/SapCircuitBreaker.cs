// ──────────────────────────────────────────────────────────────────────────────
// GrpoAdapter.Resilience.SapCircuitBreaker
//
// Polly-based resilience policies for SAP DI API operations:
//   - Retry: 3 attempts with exponential backoff for Retryable errors only
//   - Circuit Breaker: opens after 5 consecutive failures, half-open at 30s
//   - Timeout: 60s per posting attempt
//
// Fatal errors bypass retry and propagate immediately.
// ──────────────────────────────────────────────────────────────────────────────

using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using Polly.Timeout;
using Microsoft.Extensions.Logging;
using GrpoAdapter.Errors;
using GrpoAdapter.Models;

namespace GrpoAdapter.Resilience;

/// <summary>
/// Polly resilience pipeline for SAP DI API GRPO posting operations.
/// </summary>
public sealed class SapCircuitBreaker
{
    private readonly ResiliencePipeline<GrpoPostResult> _pipeline;
    private readonly ILogger<SapCircuitBreaker> _logger;

    public SapCircuitBreaker(ILogger<SapCircuitBreaker> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _pipeline = BuildPipeline();
    }

    /// <summary>
    /// Executes the GRPO posting operation through the resilience pipeline.
    /// Retryable errors trigger retry with backoff; Fatal errors propagate immediately.
    /// </summary>
    public async ValueTask<GrpoPostResult> ExecuteAsync(
        Func<CancellationToken, ValueTask<GrpoPostResult>> operation,
        CancellationToken cancellationToken = default)
    {
        return await _pipeline.ExecuteAsync(operation, cancellationToken);
    }

    private ResiliencePipeline<GrpoPostResult> BuildPipeline()
    {
        return new ResiliencePipelineBuilder<GrpoPostResult>()

            // ── Layer 1: Timeout (outermost) ─────────────────────────────────
            .AddTimeout(new TimeoutStrategyOptions
            {
                Timeout = TimeSpan.FromSeconds(60),
                OnTimeout = args =>
                {
                    _logger.LogWarning("SAP operation timed out after {Elapsed}",
                        args.Timeout);
                    return default;
                }
            })

            // ── Layer 2: Retry (only for Retryable errors) ───────────────────
            .AddRetry(new RetryStrategyOptions<GrpoPostResult>
            {
                MaxRetryAttempts = 3,
                BackoffType = DelayBackoffType.Exponential,
                Delay = TimeSpan.FromSeconds(1), // 1s → 2s → 4s
                ShouldHandle = new PredicateBuilder<GrpoPostResult>()
                    .Handle<GrpoPostException>(ex => ex.Severity == ErrorSeverity.Retryable)
                    .Handle<TimeoutException>()
                    .Handle<System.Net.Sockets.SocketException>()
                    .HandleResult(r => !r.Success && r.ErrorSeverity == ErrorSeverity.Retryable),
                OnRetry = args =>
                {
                    _logger.LogWarning(
                        "SAP retry #{Attempt} after {Delay}ms — Reason: {Reason}",
                        args.AttemptNumber,
                        args.RetryDelay.TotalMilliseconds,
                        args.Outcome.Exception?.Message ?? args.Outcome.Result?.ErrorMessage ?? "unknown");
                    return default;
                }
            })

            // ── Layer 3: Circuit Breaker ─────────────────────────────────────
            .AddCircuitBreaker(new CircuitBreakerStrategyOptions<GrpoPostResult>
            {
                FailureRatio = 1.0, // 100% failure rate in sampling window
                SamplingDuration = TimeSpan.FromSeconds(30),
                MinimumThroughput = 5, // Opens after 5 consecutive failures
                BreakDuration = TimeSpan.FromSeconds(30), // Half-open after 30s
                ShouldHandle = new PredicateBuilder<GrpoPostResult>()
                    .Handle<GrpoPostException>(ex => ex.Severity == ErrorSeverity.Retryable)
                    .Handle<TimeoutException>()
                    .HandleResult(r => !r.Success && r.ErrorSeverity == ErrorSeverity.Retryable),
                OnOpened = args =>
                {
                    _logger.LogError(
                        "Circuit OPENED — SAP operations halted for {Duration}s. " +
                        "Reason: {Reason}",
                        args.BreakDuration.TotalSeconds,
                        args.Outcome.Exception?.Message ?? "consecutive failures");
                    return default;
                },
                OnClosed = _ =>
                {
                    _logger.LogInformation("Circuit CLOSED — SAP operations resumed");
                    return default;
                },
                OnHalfOpened = _ =>
                {
                    _logger.LogInformation("Circuit HALF-OPEN — testing SAP connectivity");
                    return default;
                }
            })

            .Build();
    }
}
