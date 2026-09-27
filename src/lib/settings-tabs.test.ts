import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSettingsSection, settingsHref } from "./settings-tabs";

test("parseSettingsSection keeps known sections", () => {
  assert.equal(parseSettingsSection("apariencia"), "apariencia");
  assert.equal(parseSettingsSection("cuenta"), "cuenta");
});

test("parseSettingsSection returns null for missing or unknown values", () => {
  assert.equal(parseSettingsSection(null), null);
  assert.equal(parseSettingsSection(undefined), null);
  assert.equal(parseSettingsSection(""), null);
  assert.equal(parseSettingsSection("toString"), null);
  assert.equal(parseSettingsSection("PERFIL"), null);
});

test("settingsHref builds the query link", () => {
  assert.equal(settingsHref("seguridad"), "/settings?seccion=seguridad");
});
