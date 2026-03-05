/**
 * UAT Runner – Automated Test Execution & Reporting
 *
 * Steps through each user story, captures timing and outcomes,
 * generates the UAT sign-off report.
 */

import type { UserStory, TestResult } from './uat-test-suite';
import { calculatePassRate } from './uat-test-suite';

// ── Runner Events ────────────────────────────────────────────────────────────

export type UatEvent =
    | { type: 'suite_started'; totalStories: number }
    | { type: 'story_started'; storyId: string; title: string }
    | { type: 'story_completed'; storyId: string; passed: boolean; durationMs: number }
    | { type: 'suite_completed'; report: UatReport };

type EventListener = (event: UatEvent) => void;

// ── Report ───────────────────────────────────────────────────────────────────

export interface UatReport {
    reportId: string;
    generatedAt: string;
    environment: string;
    pilotSite: string;
    totalStories: number;
    passedStories: number;
    failedStories: number;
    overallPassRate: number;
    mustHavePassRate: number;
    totalDurationMs: number;
    stories: Array<{
        id: string;
        title: string;
        priority: string;
        passed: boolean;
        durationMs: number;
        notes: string;
    }>;
    signOff: {
        passedThreshold: boolean;
        recommendation: 'GO' | 'NO-GO' | 'CONDITIONAL';
        notes: string;
    };
}

// ── Runner ───────────────────────────────────────────────────────────────────

export function createUatRunner(
    suite: UserStory[],
    environment: string = 'Riyadh Production'
) {
    const listeners: EventListener[] = [];

    function emit(event: UatEvent): void {
        for (const listener of listeners) {
            try { listener(event); } catch { /* observer safety */ }
        }
    }

    return {
        /**
         * Executes the full test suite.
         * Each story's test function is provided by the caller.
         */
        async run(
            testFunctions: Record<string, (story: UserStory) => Promise<TestResult>>
        ): Promise<UatReport> {
            const suiteStart = performance.now();
            emit({ type: 'suite_started', totalStories: suite.length });

            for (const story of suite) {
                const testFn = testFunctions[story.id];
                if (!testFn) {
                    story.status = 'skipped';
                    continue;
                }

                story.status = 'running';
                emit({ type: 'story_started', storyId: story.id, title: story.title });

                try {
                    const result = await testFn(story);
                    story.result = result;
                    story.status = result.passed ? 'passed' : 'failed';
                } catch (error) {
                    story.status = 'failed';
                    story.result = {
                        passed: false,
                        durationMs: 0,
                        criteriaResults: [],
                        notes: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        testedBy: 'automated',
                        testedAt: new Date().toISOString(),
                    };
                }

                emit({
                    type: 'story_completed',
                    storyId: story.id,
                    passed: story.result!.passed,
                    durationMs: story.result!.durationMs,
                });
            }

            const totalDurationMs = Math.round(performance.now() - suiteStart);
            const passRate = calculatePassRate(suite);

            const report = generateReport(suite, passRate, totalDurationMs, environment);
            emit({ type: 'suite_completed', report });

            return report;
        },

        /**
         * Records a manual test result for a specific story.
         */
        recordManualResult(storyId: string, result: TestResult): void {
            const story = suite.find(s => s.id === storyId);
            if (story) {
                story.result = result;
                story.status = result.passed ? 'passed' : 'failed';
            }
        },

        onEvent(listener: EventListener) {
            listeners.push(listener);
            return () => {
                const idx = listeners.indexOf(listener);
                if (idx >= 0) listeners.splice(idx, 1);
            };
        },
    };
}

function generateReport(
    suite: UserStory[],
    passRate: ReturnType<typeof calculatePassRate>,
    totalDurationMs: number,
    environment: string
): UatReport {
    const passed = passRate.mustHavePassRate === 100;

    return {
        reportId: `UAT-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        environment,
        pilotSite: 'Riyadh Central Warehouse',
        totalStories: suite.length,
        passedStories: passRate.passed,
        failedStories: passRate.failed,
        overallPassRate: passRate.rate,
        mustHavePassRate: passRate.mustHaveRate,
        totalDurationMs,
        stories: suite.map(s => ({
            id: s.id,
            title: s.title,
            priority: s.priority,
            passed: s.result?.passed ?? false,
            durationMs: s.result?.durationMs ?? 0,
            notes: s.result?.notes ?? 'Not tested',
        })),
        signOff: {
            passedThreshold: passed,
            recommendation: passed ? 'GO' : passRate.mustHaveRate >= 80 ? 'CONDITIONAL' : 'NO-GO',
            notes: passed
                ? 'All must-have stories passed. Pilot is GO for production.'
                : `Must-have pass rate: ${passRate.mustHaveRate}%. Review failures before proceeding.`,
        },
    };
}
