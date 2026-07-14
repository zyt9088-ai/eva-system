require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from("evaluations")
    .insert({
      pr_number: "TEST-001",
      project_name: "Test Project",
      deadline: new Date().toISOString(),
      type: "VENDOR_PERFORMANCE",
    })
    .select()
    .single();

  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log("Insert succeeded:", data);
  }
}

testInsert();
