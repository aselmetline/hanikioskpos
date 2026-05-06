// Diagnostic: list env vars available to the test runner.
Deno.test("env probe", () => {
  const keys = Object.keys(Deno.env.toObject()).sort();
  console.log("ENV KEYS:", keys.join(","));
});
