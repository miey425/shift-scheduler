import { config } from "dotenv";
import { checkDatabaseConnection } from "../src/db";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const result = await checkDatabaseConnection();

  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }

  console.log(result.message);
  console.log(`checkedAt: ${result.checkedAt}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
});
