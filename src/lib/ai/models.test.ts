import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultModel, modelsFor, parseModel } from "./models";
import { PROVIDERS } from "./provider";

test("each provider with a fixed catalog offers its default model", () => {
  for (const provider of PROVIDERS) {
    const models = modelsFor(provider);
    if (models) assert.ok(models.some((m) => m.id === defaultModel(provider)));
  }
});

test("a model is only valid under the provider that lists it", () => {
  // Groq and OpenRouter both serve gpt-oss-120b, each behind its own key.
  assert.equal(parseModel("groq", defaultModel("groq")), defaultModel("groq"));
  assert.equal(parseModel("gemini", defaultModel("groq")), null);
});

test("parseModel defaults when the client sends none", () => {
  assert.equal(parseModel("groq", undefined), defaultModel("groq"));
});

test("parseModel rejects a model outside a fixed catalog", () => {
  assert.equal(parseModel("gemini", "gpt-4o"), null);
});

test("parseModel accepts a dynamic catalog's ids by shape", () => {
  assert.equal(parseModel("copilot", "claude-sonnet-4"), "claude-sonnet-4");
  assert.equal(parseModel("copilot", "gpt 4o; drop"), null);
  assert.equal(parseModel("copilot", 42), null);
  assert.equal(parseModel("copilot", "x".repeat(101)), null);
});
