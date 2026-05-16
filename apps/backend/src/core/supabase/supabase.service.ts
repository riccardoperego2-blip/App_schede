import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { AppConfig } from '../config/app.config';

@Injectable()
export class SupabaseService {
  readonly admin: SupabaseClient;

  constructor(config: ConfigService) {
    const app = config.getOrThrow<AppConfig>('app');
    this.admin = createClient(app.supabaseUrl, app.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async verifyBearerToken(token: string): Promise<User> {
    const { data, error } = await this.admin.auth.getUser(token);
    if (error || !data.user) throw error ?? new Error('Invalid Supabase user token');
    return data.user;
  }
}
