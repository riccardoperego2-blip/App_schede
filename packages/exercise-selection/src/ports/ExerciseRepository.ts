import type { ExerciseCatalogEntry } from '../../../../shared/exerciseClassification';

export interface ExerciseRepository {
  loadCatalog(): Promise<readonly ExerciseCatalogEntry[]>;
  findBySlug(slug: string): Promise<ExerciseCatalogEntry | undefined>;
}
