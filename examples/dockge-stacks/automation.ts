import * as pulumi from "@pulumi/pulumi/automation";
import * as path from "path";

/**
 * Automation API wrapper for programmatically managing Dockge stacks.
 * This can be used to run Pulumi operations from Node.js scripts
 * without the Pulumi CLI.
 *
 * Usage:
 *   npx ts-node automation.ts [preview|up|destroy]
 */

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "preview";

  const stackName = "dev";
  const workDir = path.join(__dirname);

  // Create or select the stack using the local project
  const stack = await pulumi.LocalWorkspace.createOrSelectStack({
    stackName,
    workDir,
  });

  console.log(`Stack: ${stackName}`);
  console.log(`Command: ${command}`);

  switch (command) {
    case "preview": {
      const result = await stack.preview({ onOutput: console.log });
      console.log(`\nChanges: ${JSON.stringify(result.changeSummary)}`);
      break;
    }
    case "up": {
      const result = await stack.up({ onOutput: console.log });
      console.log(`\nOutputs: ${JSON.stringify(result.outputs)}`);
      break;
    }
    case "destroy": {
      const result = await stack.destroy({ onOutput: console.log });
      console.log(`\nDestroy complete.`);
      break;
    }
    default:
      console.error(`Unknown command: ${command}. Use: preview, up, or destroy`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
