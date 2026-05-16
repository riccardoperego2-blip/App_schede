import type { ExerciseCatalogEntry } from '../../../../shared/exerciseClassification';
import { ExerciseRepositoryBase } from './ExerciseRepositoryBase';

export class InMemoryExerciseRepository extends ExerciseRepositoryBase {
  constructor(private readonly exercises: readonly ExerciseCatalogEntry[]) {
    super();
  }

  override async loadCatalog(): Promise<readonly ExerciseCatalogEntry[]> {
    return this.exercises;
  }
}
