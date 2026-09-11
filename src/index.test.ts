import { describe, expect, it } from "vitest";
import { readRawText } from "./index";

function fakeStream(chunks: string[]) {
  const enc = new TextEncoder();
  const bufs = chunks.map(c => enc.encode(c));
  let i = 0;
  return {
    getReader() {
      return {
        async read() {
          if (i >= bufs.length) return { done: true, value: undefined };
          return { done: false, value: bufs[i++] };
        },
        releaseLock() {},
      };
    },
  };
}

describe("readRawText (email() raw handling)", () => {
  it("reads a ReadableStream (real ForwardableEmailMessage shape)", async () => {
    const text = await readRawText(fakeStream(["Hello ", "world"]) as any);
    expect(text).toBe("Hello world");
  });
  it("reads Blob-like with arrayBuffer", async () => {
    const blobLike = { arrayBuffer: async () => new TextEncoder().encode("blob-body").buffer };
    expect(await readRawText(blobLike as any)).toBe("blob-body");
  });
  it("returns empty for null (test-ingest path)", async () => {
    expect(await readRawText(null)).toBe("");
  });
  it("never throws on hostile input", async () => {
    expect(await readRawText({ getReader: () => { throw new Error("boom"); } } as any)).toBe("");
    expect(await readRawText(42 as any)).toBe("");
  });
});
