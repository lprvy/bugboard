import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { api, ApiError, describeApiError, label } from "./api.ts";

type FetchArgs = [string, RequestInit];

function mockFetch(status: number, body?: unknown) {
  const response =
    body === undefined
      ? new Response(null, { status })
      : new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status,
          statusText: status === 500 ? "Internal Server Error" : "",
          headers: { "Content-Type": "application/json" },
        });
  return mock.method(globalThis, "fetch", async () => response);
}

afterEach(() => mock.restoreAll());

describe("describeApiError", () => {
  it("uses the error message when there are no validation issues", () => {
    assert.equal(describeApiError(new ApiError(404, "Bug not found")), "Bug not found");
  });

  it("lists every validation issue", () => {
    const err = new ApiError(400, "Validation failed", [
      { path: ["title"], message: "Title must be at least 3 characters" },
      { path: ["severity"], message: "Invalid severity" },
    ]);
    assert.equal(describeApiError(err), "Title must be at least 3 characters; Invalid severity");
  });
});

describe("api", () => {
  it("sends JSON to the API and returns the parsed body", async () => {
    const fetch = mockFetch(201, { id: 7, title: "Login fails" });
    const bug = await api<{ id: number }>("/bugs", { method: "POST", body: "{}" });

    assert.equal(bug.id, 7);
    const [url, init] = fetch.mock.calls[0].arguments as unknown as FetchArgs;
    assert.equal(url, "http://localhost:4000/bugs");
    assert.equal(init.method, "POST");
    assert.equal(init.cache, "no-store");
    assert.deepEqual(init.headers, { "Content-Type": "application/json" });
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch(204);
    assert.equal(await api("/bugs/1", { method: "DELETE" }), undefined);
  });

  it("throws an ApiError with the API's message and validation details", async () => {
    mockFetch(400, { error: "Validation failed", details: [{ path: ["title"], message: "Too short" }] });
    await assert.rejects(api("/bugs", { method: "POST" }), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 400);
      assert.equal(err.message, "Validation failed");
      assert.deepEqual(err.details, [{ path: ["title"], message: "Too short" }]);
      return true;
    });
  });

  it("falls back to the status text when the error body is not JSON", async () => {
    mockFetch(500, "<html>oops</html>");
    await assert.rejects(api("/stats"), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.message, "Internal Server Error");
      assert.deepEqual(err.details, []);
      return true;
    });
  });
});

describe("label", () => {
  it("turns underscores into spaces", () => {
    assert.equal(label("in_progress"), "in progress");
    assert.equal(label("open"), "open");
  });
});
