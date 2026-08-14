import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  childName: z.string().min(1),
  dob: z.string().optional().nullable(),
  batchId: z.string().uuid().optional().nullable(),
  parentName: z.string().min(1),
  parentPhone: z.string().min(6),
});

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export const createStudentWithParent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Could not verify your permissions.");
    if (!isAdmin) throw new Error("Only admins can add students.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.parentPhone);
    const password = generatePassword();

    // Reuse an existing parent account for this phone number when there is one.
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("phone", phone)
      .maybeSingle();

    let parentId = existing?.id ?? null;
    let createdNewAccount = false;

    if (!parentId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        password,
        phone_confirm: true,
        user_metadata: { full_name: data.parentName },
      });
      if (createError || !created.user) {
        throw new Error(createError?.message ?? "Could not create the parent login.");
      }
      parentId = created.user.id;
      createdNewAccount = true;

      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: parentId,
        role: "parent",
        full_name: data.parentName,
        phone,
      });
      if (profileError) throw new Error(profileError.message);
    }

    const { data: child, error: childError } = await supabaseAdmin
      .from("children")
      .insert({
        name: data.childName,
        dob: data.dob || null,
        batch_id: data.batchId || null,
        parent_id: parentId,
      })
      .select("id, name")
      .single();
    if (childError) throw new Error(childError.message);

    return {
      childId: child.id,
      childName: child.name,
      parentPhone: phone,
      createdNewAccount,
      password: createdNewAccount ? password : null,
    };
  });