require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSelect() {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Select failed:", error);
  } else {
    console.log("Select succeeded:", data);
  }
}

testSelect();
