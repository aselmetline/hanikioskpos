// Integration tests for the `process_sale` RPC.
//
// Covers:
//   1. REVOKE/GRANT enforcement → anon role cannot execute the function.
//   2. Cross-tenant rejection   → an authenticated user cannot pass a
//      customer_id / product_id belonging to a different user_id.
//   3. Stock guard              → insufficient stock raises an exception.
//
// Requires env vars (auto-injected in edge-function runtime):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

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
  // Cascade-friendly cleanup: delete owned data first, then the auth user.
  await admin.from("sale_items").delete().in(
    "sale_id",
    (await admin.from("sales").select("id").eq("user_id", id)).data?.map((r) => r.id) ?? [],
  );
  await admin.from("sales").delete().eq("user_id", id);
  await admin.from("points_transactions").delete().eq("user_id", id);
  await admin.from("cash_box_transactions").delete().eq("user_id", id);
  await admin.from("products").delete().eq("user_id", id);
  await admin.from("customers").delete().eq("user_id", id);
  await admin.auth.admin.deleteUser(id);
}

async function seedProduct(userId: string, stock: number) {
  const { data, error } = await admin.from("products").insert({
    user_id: userId,
    name: "Test Product",
    name_ar: "منتج اختبار",
    price: 10,
    cost: 5,
    stock,
    unit: "قطعة",
    category: "daily",
    low_stock_alert: 1,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function seedCustomer(userId: string) {
  const { data, error } = await admin.from("customers").insert({
    user_id: userId,
    name: "Test Customer",
    points: 0,
    credit_balance: 0,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.test("anon role cannot execute process_sale (REVOKE enforced)", async () => {
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anon.rpc("process_sale", {
    p_items: [{ product_id: null, product_name: "x", price: 1, quantity: 1, discount: 0 }],
    p_subtotal: 1, p_tax: 0, p_discount: 0, p_total: 1,
    p_payment_method: "cash",
  });

  assertEquals(data, null);
  assertExists(error);
  // Either "Not authenticated" (raised by function) or a permission error from REVOKE.
  const msg = (error.message || "").toLowerCase();
  assert(
    msg.includes("not authenticated") ||
      msg.includes("permission denied") ||
      msg.includes("not allowed"),
    `Unexpected error: ${error.message}`,
  );
});

Deno.test({ name: "authenticated user cannot use another user's product_id", ignore: !HAS_ADMIN, fn: async () => {
  const userA = await createTestUser("a-prod");
  const userB = await createTestUser("b-prod");
  try {
    const productOfB = await seedProduct(userB.id, 100);

    const { data, error } = await userA.client.rpc("process_sale", {
      p_items: [{
        product_id: productOfB,
        product_name: "leak",
        price: 10,
        quantity: 1,
        discount: 0,
      }],
      p_subtotal: 10, p_tax: 0, p_discount: 0, p_total: 10,
      p_payment_method: "cash",
    });

    assertEquals(data, null);
    assertExists(error);
    assert(
      /not found or access denied/i.test(error.message),
      `Unexpected error: ${error.message}`,
    );

    // Confirm B's stock was NOT decremented and no sale was inserted for A.
    const { data: prod } = await admin.from("products").select("stock").eq("id", productOfB).single();
    assertEquals(prod?.stock, 100);
    const { count } = await admin.from("sales").select("id", { count: "exact", head: true }).eq("user_id", userA.id);
    assertEquals(count, 0);
  } finally {
    await cleanupUser(userA.id);
    await cleanupUser(userB.id);
  }
});

Deno.test("authenticated user cannot use another user's customer_id", async () => {
  const userA = await createTestUser("a-cust");
  const userB = await createTestUser("b-cust");
  try {
    const customerOfB = await seedCustomer(userB.id);

    const { data, error } = await userA.client.rpc("process_sale", {
      p_items: [{ product_id: null, product_name: "manual", price: 5, quantity: 1, discount: 0 }],
      p_subtotal: 5, p_tax: 0, p_discount: 0, p_total: 5,
      p_payment_method: "credit",
      p_customer_id: customerOfB,
    });

    assertEquals(data, null);
    assertExists(error);
    assert(
      /customer not found or access denied/i.test(error.message),
      `Unexpected error: ${error.message}`,
    );

    // No credit applied to B's customer.
    const { data: cust } = await admin.from("customers").select("credit_balance").eq("id", customerOfB).single();
    assertEquals(Number(cust?.credit_balance), 0);
  } finally {
    await cleanupUser(userA.id);
    await cleanupUser(userB.id);
  }
});

Deno.test("insufficient stock raises and aborts the transaction", async () => {
  const user = await createTestUser("stock");
  try {
    const productId = await seedProduct(user.id, 2);

    const { data, error } = await user.client.rpc("process_sale", {
      p_items: [{
        product_id: productId,
        product_name: "Test",
        price: 10,
        quantity: 5,
        discount: 0,
      }],
      p_subtotal: 50, p_tax: 0, p_discount: 0, p_total: 50,
      p_payment_method: "cash",
    });

    assertEquals(data, null);
    assertExists(error);
    assert(/insufficient stock/i.test(error.message), `Unexpected error: ${error.message}`);

    // Stock unchanged; no sale row.
    const { data: prod } = await admin.from("products").select("stock").eq("id", productId).single();
    assertEquals(prod?.stock, 2);
    const { count } = await admin.from("sales").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    assertEquals(count, 0);
  } finally {
    await cleanupUser(user.id);
  }
});

Deno.test("happy path: authenticated user with own data succeeds", async () => {
  const user = await createTestUser("happy");
  try {
    const productId = await seedProduct(user.id, 10);
    const customerId = await seedCustomer(user.id);

    const { data, error } = await user.client.rpc("process_sale", {
      p_items: [{
        product_id: productId,
        product_name: "Test",
        price: 10,
        quantity: 2,
        discount: 0,
      }],
      p_subtotal: 20, p_tax: 0, p_discount: 0, p_total: 20,
      p_payment_method: "cash",
      p_customer_id: customerId,
      p_auto_add_to_cashbox: true,
      p_points_per_dinar: 1,
    });

    assertEquals(error, null);
    assertExists(data);
    const result = data as { sale_id: string; points_earned: number };
    assertExists(result.sale_id);
    assertEquals(result.points_earned, 20);

    const { data: prod } = await admin.from("products").select("stock").eq("id", productId).single();
    assertEquals(prod?.stock, 8);

    const { data: cust } = await admin.from("customers").select("points").eq("id", customerId).single();
    assertEquals(cust?.points, 20);
  } finally {
    await cleanupUser(user.id);
  }
});
