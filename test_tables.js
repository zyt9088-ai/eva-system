require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase
    .rpc('get_tables') // Supabase doesn't have a default get_tables, we can query information_schema.
    .select('*');

  // Since RPC might fail, let's just query a known table or run a query using the REST API.
  // Actually we can just query pg_catalog or information_schema using fetch if we have anon key? No, anon key restricts access.
  // Let's just try to select from expected table names.
}

async function trySelect(tableName) {
  const { data, error } = await supabase.from(tableName).select().limit(1);
  if (error) console.log(`Table ${tableName} error:`, error.message);
  else console.log(`Table ${tableName} exists! Columns:`, data.length === 0 ? "Empty" : Object.keys(data[0]));
}

async function run() {
  await trySelect("evaluators");
  await trySelect("vendors");
  await trySelect("evf_criteria");
  await trySelect("evaluated_items");
  await trySelect("item_evaluations");
  await trySelect("evaluator_scores");
  await trySelect("evaluations");
}

run();
