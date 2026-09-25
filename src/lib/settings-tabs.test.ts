import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSettingsTab, settingsHref } from "./settings-tabs";

test("parseSettingsTab keeps known tabs", () => {
  assert.equal(parseSettingsTab("apariencia"), "apariencia");
  assert.equal(parseSettingsTab("cuenta"), "cuenta");
});

test("parseSettingsTab falls back to perfil", () => {
  assert.equal(parseSettingsTab(null), "perfil");
  assert.equal(parseSettingsTab(undefined), "perfil");
  assert.equal(parseSettingsTab("toString"), "perfil");
  assert.equal(parseSettingsTab("PERFIL"), "perfil");
});

test("settingsHref builds the query link", () => {
  assert.equal(settingsHref("seguridad"), "/settings?seccion=seguridad");
});
