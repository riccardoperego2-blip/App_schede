import { useEffect, useRef, useState } from 'react';
import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/sdk';
import { ApiError } from '../lib/api/errors';
import { qk } from '../lib/api/query-keys';
import { logAuthGateTiming } from '../lib/auth/auth-gate-timing';
import { useAuthStore } from '../stores/auth.store';

type ActivePlanCache = { planId: string; versionId: string };

export interface AuthBootstrapState {
  /** True when session is known; gate does not wait for network. */
  ready: boolean;
  /** Route to tabs when true (includes provisional Home). */
  hasActivePlan: boolean;
  /** False while plan status is optimistic; avoid onboarding redirect until true. */
  planConfirmed: boolean;
}

function readActivePlanCache(
  queryClient: ReturnType<typeof useQueryClient>,
): ActivePlanCache | undefined {
  return queryClient.getQueryData<ActivePlanCache>(qk.plans.active());
}

/**
 * Resolves plan routing without blocking cold start on GET /plans/active.
 * Local onboarded flag + React Query cache = instant Home; otherwise provisional Home
 * and server verify in background (API only as fallback).
 */
export function useAuthBootstrap(): AuthBootstrapState {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const onboardedUserId = useAuthStore((s) => s.onboardedUserId);
  const markOnboarded = useAuthStore((s) => s.markOnboarded);
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const verifyStartedRef = useRef(false);

  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [planConfirmed, setPlanConfirmed] = useState(false);

  useEffect(() => {
    verifyStartedRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (status === 'idle' || status === 'loading') {
      return;
    }

    if (status === 'unauthenticated' || !userId) {
      setHasActivePlan(false);
      setPlanConfirmed(true);
      logAuthGateTiming('bootstrap:unauthenticated');
      return;
    }

    const localOnboarded = onboardedUserId === userId;
    const cached = readActivePlanCache(queryClient);

    if (localOnboarded) {
      setHasActivePlan(true);
      setPlanConfirmed(true);
      logAuthGateTiming('bootstrap:local-onboarded', { userId });
      return;
    }

    if (cached?.planId) {
      markOnboarded();
      setHasActivePlan(true);
      setPlanConfirmed(true);
      logAuthGateTiming('bootstrap:rq-cache', { planId: cached.planId });
      return;
    }

    setHasActivePlan(true);
    setPlanConfirmed(false);
    logAuthGateTiming('bootstrap:provisional-home', { isRestoring });
  }, [status, userId, onboardedUserId, queryClient, markOnboarded, isRestoring]);

  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;
    if (onboardedUserId === userId) return;
    if (readActivePlanCache(queryClient)?.planId) return;
    if (planConfirmed) return;
    if (isRestoring) return;
    if (verifyStartedRef.current) return;
    verifyStartedRef.current = true;

    let cancelled = false;

    async function verifyActivePlan(): Promise<void> {
      const cachedAfterRestore = readActivePlanCache(queryClient);
      if (cachedAfterRestore?.planId) {
        markOnboarded();
        if (!cancelled) {
          setHasActivePlan(true);
          setPlanConfirmed(true);
        }
        logAuthGateTiming('bootstrap:cache-after-restore', {
          planId: cachedAfterRestore.planId,
        });
        return;
      }

      const startedAt = Date.now();
      logAuthGateTiming('bootstrap:api-fallback-start');

      try {
        const active = await api.plans.active();
        queryClient.setQueryData(qk.plans.active(), active);
        markOnboarded();
        if (!cancelled) {
          setHasActivePlan(true);
          setPlanConfirmed(true);
        }
        logAuthGateTiming('bootstrap:api-fallback-ok', {
          durationMs: Date.now() - startedAt,
          planId: active.planId,
        });
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.kind === 'not_found') {
            setHasActivePlan(false);
            setPlanConfirmed(true);
            logAuthGateTiming('bootstrap:api-fallback-no-plan', {
              durationMs: Date.now() - startedAt,
            });
          } else {
            setHasActivePlan(onboardedUserId === userId);
            setPlanConfirmed(true);
            logAuthGateTiming('bootstrap:api-fallback-error', {
              durationMs: Date.now() - startedAt,
              kind: error instanceof ApiError ? error.kind : 'unknown',
            });
          }
        }
      }
    }

    void verifyActivePlan();
    return () => {
      cancelled = true;
    };
  }, [
    status,
    userId,
    onboardedUserId,
    planConfirmed,
    isRestoring,
    queryClient,
    markOnboarded,
  ]);

  const ready = status !== 'idle' && status !== 'loading';

  return {
    ready,
    hasActivePlan: status === 'authenticated' ? hasActivePlan : false,
    planConfirmed: status === 'authenticated' ? planConfirmed : true,
  };
}
