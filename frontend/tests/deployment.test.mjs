import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeApiBase, validateProductionApiBase } from "../src/services/apiBase.js";
import { loginDestination } from "../src/services/navigation.js";

test("production API configuration rejects missing, local, insecure and malformed origins", () => {
  for (const value of [undefined, "", "not a URL", "http://api.example.com", "https://localhost", "https://127.0.0.2", "https://[::1]", "https://api.example.com/other", "https://api.example.com?key=never-echo", "https://user:never-echo@api.example.com"]) {
    assert.throws(() => validateProductionApiBase(value), error => error.message.includes("VITE_API_BASE_URL") && !error.message.includes("never-echo"));
  }
  assert.equal(validateProductionApiBase(" https://api.example.com/api/v1/// "), "https://api.example.com");
  assert.equal(normalizeApiBase("http://127.0.0.1:8000/"), "http://127.0.0.1:8000");
});

test("login preserves requested workflow and complaint query within the account role", () => {
  assert.equal(loginDestination("/track-complaint?id=42"), "/track-complaint?id=42");
  assert.equal(loginDestination("/report-issue?category=Water"), "/report-issue?category=Water");
  assert.equal(loginDestination("/authority/complaints/42", true), "/authority/complaints/42");
  for (const from of [undefined, "https://external.example", "//external.example", "/authority/dashboard", "/login", "/signup"]) assert.equal(loginDestination(from), "/my-complaints");
  assert.equal(loginDestination("/my-complaints", true), "/authority/dashboard");
  assert.equal(loginDestination("/authority/login", true), "/authority/dashboard");
});
