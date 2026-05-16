import { readFile } from 'node:fs/promises';
import type { ExerciseCatalogEntry } from '../../../../shared/exerciseClassification';
import { ExerciseRepositoryBase } from '../repositories/ExerciseRepositoryBase';

/**
 * Node-only repository: loads the bundled JSON catalog from disk.
 * Do not import this module from React Native — use `InMemoryExerciseRepository` or a Supabase adapter instead.
 */
export class NodeFsJsonExerciseRepository extends ExerciseRepositoryBase {
  constructor(private readonly absoluteJsonPath: string) {
    super();
  }

  private cache: readonly ExerciseCatalogEntry[] | undefined;

  override async loadCatalog(): Promise<readonly ExerciseCatalogEntry[]> {
    if (this.cache) return this.cache;
    const buf = await readFile(this.absoluteJsonPath, 'utf-8');
    const parsed = JSON.parse(buf) as ExerciseCatalogEntry[];
    this.cache = parsed;
    return parsed;
  }
}
