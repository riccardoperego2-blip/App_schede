import type { ExerciseRepository } from '../ports/ExerciseRepository';
import type { ExerciseCatalogEntry } from '../../../../shared/exerciseClassification';

export interface ExerciseQuery {
  readonly includeSlugs?: ReadonlySet<string>;
  readonly excludeSlugs?: ReadonlySet<string>;
}

/**
 * Repository port — implement with DB, cache, or bundled JSON.
 */
export abstract class ExerciseRepositoryBase implements ExerciseRepository {
  abstract loadCatalog(): Promise<readonly ExerciseCatalogEntry[]>;

  async findBySlug(slug: string): Promise<ExerciseCatalogEntry | undefined> {
    const all = await this.loadCatalog();
    return all.find((e) => e.slug === slug);
  }

  async query(q: ExerciseQuery): Promise<readonly ExerciseCatalogEntry[]> {
    let rows = await this.loadCatalog();
    if (q.excludeSlugs?.size) {
      rows = rows.filter((e) => !q.excludeSlugs!.has(e.slug));
    }
    if (q.includeSlugs?.size) {
      rows = rows.filter((e) => q.includeSlugs!.has(e.slug));
    }
    return rows;
  }
}
