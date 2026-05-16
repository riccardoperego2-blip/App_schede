import type { RecoveryCapacityScore, RecoveryManagementReport } from '../domain/generation.types';

/**
 * Recovery capacity gates frequency and scales distributable volume (SRA constraint).
 */
export function recoveryManagementSystem(
  recoveryCapacity: RecoveryCapacityScore,
  trainingDays: number,
): RecoveryManagementReport {
  const volumeScalarFromRecovery = 0.82 + recoveryCapacity * 0.036;
  const maxDaysByRecovery =
    recoveryCapacity <= 2 ? 4 : recoveryCapacity === 3 ? 5 : recoveryCapacity === 4 ? 6 : 7;
  const frequencyCap = Math.min(trainingDays, maxDaysByRecovery);
  return { recoveryCapacity, volumeScalarFromRecovery, frequencyCap };
}
