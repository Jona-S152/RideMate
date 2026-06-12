import { supabase } from "@/lib/supabase";

export interface UserRecord {
  id: string;
  email: string;
  is_driver: boolean;
  driver_mode: boolean;
  name: string;
}

export interface AuthSessionResponse {
  session: {
    access_token: string;
    user: {
      id: string;
      email?: string;
    };
  } | null;
  userRecord: UserRecord;
}

export const authService = {
  /**
   * Internal helper: Resolves organization based on email domain (without falling back to first organization).
   */
  async resolveOrganizationByEmail(email: string): Promise<{ id: number; city_id: number } | null> {
    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1];
    if (!domain) return null;

    let slug = domain.split('.')[0];
    if (domain.includes('espol.edu.ec') || domain.includes('espol.edu')) {
      slug = 'espol';
    } else if (domain.includes('bancoguayaquil.com') || domain.includes('bancoguayaquil')) {
      slug = 'banco-guayaquil';
    }

    console.log(`[authService.resolveOrganizationByEmail] Resolving organization: ${domain} -> slug: ${slug}`);

    let { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, city_id')
      .eq('slug', slug)
      .maybeSingle();

    if (orgError || !org) {
      console.log(`[authService.resolveOrganizationByEmail] Fallback search for slug: ${slug}...`);
      const { data: fallbackOrgs } = await supabase
        .from('organizations')
        .select('id, city_id')
        .ilike('slug', `%${slug}%`)
        .limit(1);

      if (fallbackOrgs && fallbackOrgs.length > 0) {
        org = fallbackOrgs[0];
      }
    }

    return org || null;
  },

  /**
   * Internal helper: Resolves organization and city ID based on email domain,
   * creating the organization member relationship.
   */
  async assignTenantByEmail(userId: string, email: string): Promise<number | null> {
    let org = await this.resolveOrganizationByEmail(email);

    if (!org) {
      console.log(`[authService.assignTenantByEmail] Fallback to first organization...`);
      const { data: firstOrg } = await supabase
        .from('organizations')
        .select('id, city_id')
        .limit(1)
        .maybeSingle();
      org = firstOrg;
    }

    if (org) {
      console.log(`[authService.assignTenantByEmail] Resolved org ID: ${org.id}, city ID: ${org.city_id}`);
      
      const { error: memberError } = await supabase
        .from('organization_members')
        .upsert({
          organization_id: org.id,
          user_id: userId,
          role: 'member',
          status: 'active'
        }, { onConflict: 'organization_id,user_id' });

      if (memberError) {
        console.error("[authService.assignTenantByEmail] Error creating member relation:", memberError.message);
      }
      return org.city_id;
    }

    console.warn(`[authService.assignTenantByEmail] Could not resolve organization for email: ${email}`);
    return null;
  },

  /**
   * Logs in a user using email and password.
   * Fetches user profile, auto-assigns tenant if missing, and updates last_seen_at.
   */
  async signIn(email: string, password: string): Promise<AuthSessionResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) throw new Error("No se pudo obtener el ID del usuario.");

    // Fetch user record from database
    const { data: userDataRaw, error: userError } = await supabase
      .from('users')
      .select('id, email, is_driver, role_id, name, last_name, city_id')
      .eq('id', userId);

    if (userError) throw userError;
    if (!userDataRaw || userDataRaw.length === 0) throw new Error("Usuario no encontrado.");

    const userRecord = userDataRaw[0];
    let cityId = userRecord.city_id;

    // Auto-assign tenant if missing
    if (!cityId) {
      try {
        cityId = await this.assignTenantByEmail(userId, email);
      } catch (tenantErr) {
        console.error("[authService.signIn] Error resolving tenant:", tenantErr);
      }
    }

    // Update last_seen_at and city_id in DB
    await supabase
      .from('users')
      .update({
        last_seen_at: new Date().toISOString(),
        ...(cityId ? { city_id: cityId } : {})
      })
      .eq('id', userId);

    return {
      session: data.session ? {
        access_token: data.session.access_token,
        user: {
          id: data.session.user.id,
          email: data.session.user.email
        }
      } : null,
      userRecord: {
        id: userRecord.id,
        email: userRecord.email,
        is_driver: userRecord.is_driver ?? false,
        driver_mode: userRecord.is_driver ?? false,
        name: userRecord.name ?? 'Usuario'
      }
    };
  },

  /**
   * Helper to ensure active session during registration.
   */
  async ensureSession(email: string, password: string) {
    let { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) return sessionData.session;

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) return null;

    ({ data: sessionData } = await supabase.auth.getSession());
    return sessionData.session ?? signInData.session ?? null;
  },

  /**
   * Registers a new user, automatically signs them in, resolves tenant, and inserts profile.
   */
  async signUp(form: { email: string; password: string; name: string; lastname: string }): Promise<AuthSessionResponse> {
    // Verify that the organization exists for this email domain
    const org = await this.resolveOrganizationByEmail(form.email);
    if (!org) {
      throw new Error("El dominio de tu correo electrónico no pertenece a ninguna organización registrada.");
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    });

    if (authError) throw authError;

    // Ensure we get an active session
    const session = await this.ensureSession(form.email.trim(), form.password);
    if (!session?.user) {
      throw new Error("No se pudo iniciar sesión automáticamente después del registro.");
    }

    const userId = session.user.id;

    // Insert user record in public.users first (necessary due to foreign key constraints on organization_members)
    const { error: insertError } = await supabase.from("users").insert({
      id: userId,
      name: form.name || null,
      last_name: form.lastname || null,
      email: form.email,
      is_driver: false,
      role_id: 2,
      city_id: org.city_id,
      status: 'active',
      last_seen_at: new Date().toISOString()
    });

    if (insertError) throw insertError;

    // Resolve tenant and create organization member relation
    try {
      await this.assignTenantByEmail(userId, form.email);
    } catch (tenantErr) {
      console.error("[authService.signUp] Error resolving tenant:", tenantErr);
    }

    return {
      session: {
        access_token: session.access_token,
        user: {
          id: session.user.id,
          email: session.user.email
        }
      },
      userRecord: {
        id: userId,
        email: form.email,
        is_driver: false,
        driver_mode: false,
        name: form.name
      }
    };
  },

  /**
   * signs out of the active supabase session.
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[authService.signOut] Error:", error.message);
    }
  }
};
