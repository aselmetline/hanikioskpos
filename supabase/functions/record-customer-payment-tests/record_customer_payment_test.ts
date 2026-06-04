// Integration tests for the `record_customer_payment` RPC.
//
// Covers:
//   1. anon role cannot execute the function (auth required).
//   2. Cross-tenant rejection — user A cannot pay down user B's customer debt.
//   3. Happy path — owner can record a payment and credit_balance decreases.
//
// Mirrors the structure of process_sale_test.ts.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const HAS_ADMIN = SERVICE_KEY.length > 0;
if (!ANON_KEY) throw new Error("Missing anon/publishable key env var");

const admin = HAS_ADMIN
  ? createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : (null as unknown as SupabaseClient);

interface TestUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

async function createTestUser(label: string): Promise<TestUser> {
  const email = `test-${label}-${crypto.randomUUID()}@example.com`;
  const password = "TestPassword!2026";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { id: data.user.id, email, password, client };
}

async function cleanupUser(id: string) {
  await admin.from("customer_payments").delete().eq("user_id", id);
  await admin.from("cash_box_transactions").delete().eq("user_id", id);
  await admin.from("points_transactions").delete().eq("user_id", id);
  await admin.from("customers").delete().eq("user_id", id);
  await admin.auth.admin.deleteUser(id);
}

async function seedCustomerWithDebt(userId: string, debt: number) {
  const { data, error } = await admin.from("customers").insert({
    user_id: userId,
    name: "Debtor",
    points: 0,
    credit_balance: debt,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.test("anon role cannot execute record_customer_payment", async () => {
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anon.rpc("record_customer_payment", {
    p_customer_id: crypto.randomUUID(),
    p_amount: 10,
    p_payment_method: "cash",
    p_add_to_cashbox: false,
  });

  assertEquals(data, null);
  assertExists(error);
  const msg = (error.message || "").toLowerCase();
  assert(
    msg.includes("not authenticated") ||
      msg.includes("permission denied") ||
      msg.includes("not allowed") ||
      msg.includes("not found or access denied"),
    `Unexpected error: ${error.message}`,
  );
});

Deno.test({ name: "user cannot pay down another user's customer debt", ignore: !HAS_ADMIN, fn: async () => {
  const userA = await createTestUser("a-pay");
  const userB = await createTestUser("b-pay");
  try {
    const customerOfB = await seedCustomerWithDebt(userB.id, 100);

    const { data, error } = await userA.client.rpc("record_customer_payment", {
      p_customer_id: customerOfB,
      p_amount: 50,
      p_payment_method: "cash",
      p_add_to_cashbox: false,
    });

    assertEquals(data, null);
    assertExists(error);
    assert(
      /customer not found or access denied/i.test(error.message),
      `Unexpected error: ${error.message}`,
    );

    // B's credit_balance must be unchanged.
    const { data: cust } = await admin.from("customers").select("credit_balance").eq("id", customerOfB).single();
    assertEquals(Number(cust?.credit_balance), 100);

    // No payment row created for A or B referencing this customer.
    const { count } = await admin
      .from("customer_payments")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerOfB);
    assertEquals(count, 0);
  } finally {
    await cleanupUser(userA.id);
    await cleanupUser(userB.id);
  }
}});

Deno.test({ name: "owner can record payment; credit_balance decreases", ignore: !HAS_ADMIN, fn: async () => {
  const user = await createTestUser("own-pay");
  try {
    const customerId = await seedCustomerWithDebt(user.id, 80);

    const { data, error } = await user.client.rpc("record_customer_payment", {
      p_customer_id: customerId,
      p_amount: 30,
      p_payment_method: "cash",
      p_add_to_cashbox: false,
    });

    assertEquals(error, null);
    assertExists(data);

    const { data: cust } = await admin.from("customers").select("credit_balance").eq("id", customerId).single();
    assertEquals(Number(cust?.credit_balance), 50);

    const { count } = await admin
      .from("customer_payments")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("user_id", user.id);
    assertEquals(count, 1);
  } finally {
    await cleanupUser(user.id);
  }
}});

Deno.test({ name: "negative or zero amount is rejected", ignore: !HAS_ADMIN, fn: async () => {
  const user = await createTestUser("neg-pay");
  try {
    const customerId = await seedCustomerWithDebt(user.id, 50);

    const { data, error } = await user.client.rpc("record_customer_payment", {
      p_customer_id: customerId,
      p_amount: 0,
      p_payment_method: "cash",
      p_add_to_cashbox: false,
    });

    assertEquals(data, null);
    assertExists(error);
    assert(/amount must be positive/i.test(error.message), `Unexpected error: ${error.message}`);
  } finally {
    await cleanupUser(user.id);
  }
}});
