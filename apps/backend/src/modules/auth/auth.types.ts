import type { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  readonly user: User;
}
