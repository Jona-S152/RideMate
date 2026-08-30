import { supabase } from "@/lib/supabase";
import { ActiveLegalVersions } from "@/interfaces/legal";
import * as Linking from "expo-linking";

export interface UserRecord {
  id: string;
  email: string;
  is_driver: boolean;
  driver_mode: boolean;
  name: string;
  avatar_profile?: string;
  accepted_terms_version?: string | null;
  accepted_privacy_version?: string | null;
  accepted_legal_at?: string | null;
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
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.includes("Email not confirmed")) {
        throw new Error("Tu correo electrónico aún no ha sido confirmado. Por favor revisa tu bandeja de entrada y haz clic en el enlace de confirmación.");
      } else if (signInError.message.includes("Invalid login credentials")) {
        throw new Error("Usuario no encontrado o contraseña incorrecta.");
      } else if (signInError.message.toLowerCase().includes("banned") || signInError.message.toLowerCase().includes("blocked")) {
        throw new Error("Tu cuenta ha sido suspendida o bloqueada por la administración.");
      } else {
        throw new Error("No se pudo iniciar sesión: " + signInError.message);
      }
    }

    const userId = data.user?.id;
    if (!userId) throw new Error("No se pudo obtener el ID del usuario.");

    // Fetch user record from database
    const { data: userDataRaw, error: userError } = await supabase
      .from('users')
      .select('id, email, is_driver, role_id, name, last_name, city_id, status')
      .eq('id', userId);

    if (userError) throw userError;
    if (!userDataRaw || userDataRaw.length === 0) {
      await supabase.auth.signOut().catch(() => {});
      throw new Error("Usuario no encontrado.");
    }

    const userRecord = userDataRaw[0];

    // Check if user account is banned / blocked
    if (userRecord.status === 'blocked' || userRecord.status === 'banned' || userRecord.status === 'suspended') {
      await supabase.auth.signOut().catch(() => {});
      throw new Error("Tu cuenta ha sido suspendida o bloqueada por la administración.");
    }
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
   * Phase 1: Registers user in Supabase Auth and sends confirmation email.
   * If email confirmation is disabled in Supabase, directly creates public.users record.
   */
  async signUp(form: { email: string; password: string; name: string; lastname: string; legal?: ActiveLegalVersions }): Promise<{ needsEmailConfirmation: boolean; session?: any }> {
    // Clear any existing active session from a previous user
    await supabase.auth.signOut().catch(() => {});

    // Verify that the organization exists for this email domain
    const org = await this.resolveOrganizationByEmail(form.email);
    if (!org) {
      throw new Error("El dominio de tu correo electrónico no pertenece a ninguna organización registrada.");
    }

    const redirectUrl = Linking.createURL('email-confirmation');
    console.log("[authService.signUp] Redirect URL: ", redirectUrl);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: form.name,
          lastname: form.lastname,
        }
      }
    });

    if (authError) throw authError;

    const targetUser = authData?.user || authData?.session?.user;

    // Si Supabase tiene desactivada la confirmación de correo, se genera el perfil directo en public.users
    if (targetUser && (authData?.session || targetUser.confirmed_at)) {
      const userId = targetUser.id;
      const { error: insertError } = await supabase.from("users").upsert({
        id: userId,
        name: form.name || null,
        last_name: form.lastname || null,
        email: form.email.trim(),
        is_driver: false,
        role_id: 2,
        city_id: org?.city_id,
        status: 'active',
        last_seen_at: new Date().toISOString(),
        accepted_terms_version: form.legal?.terms.version ?? null,
        accepted_privacy_version: form.legal?.privacy.version ?? null,
        accepted_legal_at: form.legal ? new Date().toISOString() : null,
      }, { onConflict: "id" });

      if (insertError) {
        throw insertError;
      } else {
        await this.assignTenantByEmail(userId, form.email.trim());
      }

      return { needsEmailConfirmation: false, session: authData?.session || null };
    }

    return { needsEmailConfirmation: true };
  },

  /**
   * Phase 2: Completes registration after email confirmation.
   * Inserts profile into public.users and assigns tenant/organization.
    */
  async completeRegistration(form: { email: string; password: string; name: string; lastname: string }): Promise<AuthSessionResponse> {
    const cleanEmail = form.email.trim().toLowerCase();
    let session = (await supabase.auth.getSession()).data.session;

    // Verify that active session matches the target registration email
    const isMatchingSession = session?.user?.email?.toLowerCase() === cleanEmail;

    if (!isMatchingSession) {
      // Clear mismatched session if any
      if (session) {
        await supabase.auth.signOut().catch(() => {});
      }

      // Sign in specifically for the newly registered email
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (signInError) {
        if (
          signInError.message.includes("Email not confirmed") ||
          signInError.message.includes("Invalid login credentials")
        ) {
          throw new Error("Tu correo electrónico aún no ha sido confirmado. Por favor revisa tu bandeja de entrada y haz clic en el enlace de confirmación.");
        }
        throw new Error("No se pudo iniciar sesión después de la confirmación: " + signInError.message);
      }
      session = signInData.session;
    }

    if (!session?.user) {
      throw new Error("No se pudo obtener la sesión después de la confirmación.");
    }

    const userId = session.user.id;
    const org = await this.resolveOrganizationByEmail(form.email);

    // Check if user record already exists (in case of retry)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existingUser) {
      // Insert user record in public.users
      const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        name: form.name || null,
        last_name: form.lastname || null,
        email: form.email,
        is_driver: false,
        role_id: 2,
        city_id: org?.city_id,
        status: 'active',
        last_seen_at: new Date().toISOString()
      });

      if (insertError) throw insertError;

      // Resolve tenant and create organization member relation
      try {
        await this.assignTenantByEmail(userId, form.email);
      } catch (tenantErr) {
        console.error("[authService.completeRegistration] Error resolving tenant:", tenantErr);
      }
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
  },

  /**
   * Fetches fresh user details from the database for a given userId.
   */
  async fetchFreshUserRecord(userId: string): Promise<Partial<UserRecord> | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, is_driver, name, last_name, avatar_profile')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      is_driver: data.is_driver ?? false,
      name: data.name ?? 'Usuario',
      avatar_profile: data.avatar_profile,
    };
  },

  /**
   * Subscribes to real-time changes on the current user's record in 'users' table.
   * Calls onUpdate callback whenever 'is_driver' or profile fields are updated in DB.
   */
  subscribeToUserChanges(userId: string, onUpdate: (updatedFields: Partial<UserRecord>) => void) {
    const channel = supabase
      .channel(`public:users:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData) {
            onUpdate({
              id: newData.id,
              email: newData.email,
              is_driver: newData.is_driver ?? false,
              name: newData.name,
              avatar_profile: newData.avatar_profile,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
