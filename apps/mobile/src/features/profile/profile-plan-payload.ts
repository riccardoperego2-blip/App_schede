import type { UserProfile } from '../../lib/api/contracts';
import type { GeneratePlanRequestPayload } from '../onboarding/onboarding.store';

/** Body for POST /v1/plans/generate from saved profile preferences. */
export function profileToGeneratePlanPayload(profile: UserProfile): GeneratePlanRequestPayload {
  return {
    trainingGoal: profile.trainingGoal,
    experienceLevel: profile.experienceLevel,
    trainingDays: profile.trainingDaysPerWeek,
    sessionDurationMinutes: profile.sessionDurationMin,
    availableEquipment: [...profile.availableEquipment],
    recoveryCapacity: 3,
    priorityMuscleGroups: [],
  };
}
