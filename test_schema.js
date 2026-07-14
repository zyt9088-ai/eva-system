require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchema() {
  const { data, error } = await supabase
    .from("evaluations")
    .select()
    .limit(1);
    
  if (error) {
    console.log("Error:", error);
  } else {
    console.log("Columns exists?", data.length === 0 ? "Empty table, but success." : Object.keys(data[0]));
    
    // Attempting to just select to see the keys using a dummy insert that will fail and return the keys
    const { data: insertData, error: insertError } = await supabase.from('evaluations').insert({}).select();
    console.log("Insert Error Details:", insertError);
  }
}

testSchema();
