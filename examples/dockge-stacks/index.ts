import * as pulumi from "@pulumi/pulumi";
import * as dockge from "@pulumi/dockge";
import * as fs from "fs";
import * as path from "path";

// ──────────────────────────────────────────────
// Provider Configuration
// Set these via: pulumi config set dockge:url http://YOUR_DOCKGE_HOST:5001
//                pulumi config set --secret dockge:apiKey YOUR_API_KEY
// ──────────────────────────────────────────────

const stacksDir = path.join(__dirname, "stacks");

// Dynamically discover and deploy all stacks from the stacks/ directory
const stackDirs = fs.readdirSync(stacksDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const stackName of stackDirs) {
  const stackPath = path.join(stacksDir, stackName);

  const composePath = path.join(stackPath, "compose.yaml");
  if (!fs.existsSync(composePath)) {
    pulumi.log.warn(`Skipping ${stackName}: no compose.yaml found`);
    continue;
  }

  let composeYaml = fs.readFileSync(composePath, "utf-8");

  // Read .env file if it exists
  const envPath = path.join(stackPath, ".env");
  let envFile = "";
  if (fs.existsSync(envPath)) {
    envFile = fs.readFileSync(envPath, "utf-8");
  }

  // Handle GENERATE placeholders in env files:
  // Lines like PASSWORD=GENERATE will get a random value
  // (Requires @pulumi/random — uncomment below if needed)
  //
  // import * as random from "@pulumi/random";
  // const matches = envFile.match(/^(\w+)=GENERATE$/gm);
  // if (matches) {
  //   for (const match of matches) {
  //     const key = match.split("=")[0];
  //     const pw = new random.RandomPassword(`${stackName}-${key}`, { length: 32 });
  //     // Note: env files are strings, so you'd need to use apply() for dynamic values
  //   }
  // }

  const stack = new dockge.DockgeStack(stackName, {
    name: stackName,
    composeYaml,
    envFile,
    running: true,
  });

  // Export the status of each stack
  exports[`${stackName}Status`] = stack.status;
}
