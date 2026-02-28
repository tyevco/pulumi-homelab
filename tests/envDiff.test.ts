import { diffEnvFile } from "../src/envDiff";

describe("diffEnvFile", () => {
  it("returns empty array when both are identical", () => {
    const env = "FOO=bar\nBAZ=qux";
    expect(diffEnvFile(env, env)).toEqual([]);
  });

  it("detects added variable", () => {
    const changes = diffEnvFile("FOO=bar", "FOO=bar\nNEW=val");
    expect(changes).toEqual([{ kind: "ADD", path: "NEW" }]);
  });

  it("detects removed variable", () => {
    const changes = diffEnvFile("FOO=bar\nOLD=val", "FOO=bar");
    expect(changes).toEqual([{ kind: "DELETE", path: "OLD" }]);
  });

  it("detects updated variable", () => {
    const changes = diffEnvFile("FOO=bar", "FOO=baz");
    expect(changes).toEqual([{ kind: "UPDATE", path: "FOO" }]);
  });

  it("ignores comments and blank lines", () => {
    const oldEnv = "# comment\n\nFOO=bar";
    const newEnv = "# different comment\n\n\nFOO=bar";
    expect(diffEnvFile(oldEnv, newEnv)).toEqual([]);
  });

  it("treats key with no = as empty value", () => {
    const changes = diffEnvFile("KEY_ONLY", "KEY_ONLY=value");
    expect(changes).toEqual([{ kind: "UPDATE", path: "KEY_ONLY" }]);
  });

  it("returns empty when both are empty strings", () => {
    expect(diffEnvFile("", "")).toEqual([]);
  });

  it("detects multiple mixed changes", () => {
    const oldEnv = "KEEP=same\nDEL=old\nCHANGE=v1";
    const newEnv = "KEEP=same\nADD=new\nCHANGE=v2";
    const changes = diffEnvFile(oldEnv, newEnv);

    expect(changes).toContainEqual({ kind: "DELETE", path: "DEL" });
    expect(changes).toContainEqual({ kind: "ADD", path: "ADD" });
    expect(changes).toContainEqual({ kind: "UPDATE", path: "CHANGE" });
    expect(changes.length).toBe(3);
  });
});
