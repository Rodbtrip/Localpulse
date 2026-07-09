"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getUnreadNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, message, created_at")
    .eq("customer_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).in("id", ids);
  revalidatePath("/my-offers");
}
