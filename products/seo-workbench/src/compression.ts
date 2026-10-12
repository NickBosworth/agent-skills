import { createGunzip, createInflate, createBrotliDecompress } from "node:zlib";

/** Bound each decoded layer, and stop native decoding on cancellation or deadline. */
export async function decompress(
  input: Buffer,
  encoding: string,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Buffer> {
  const layers = encoding
    .toLowerCase()
    .split(",")
    .map((value) => value.trim());
  if (
    layers.length > 3 ||
    layers.some(
      (value) =>
        !["identity", "gzip", "x-gzip", "deflate", "br"].includes(value),
    )
  )
    throw new Error("unsupported-content-encoding");
  if (input.length > maxBytes) throw new Error("response-budget");
  let body = input;
  for (const layer of layers.reverse()) {
    if (signal.aborted) throw signal.reason;
    if (layer === "identity") continue;
    body = await new Promise<Buffer>((resolve, reject) => {
      const decoder =
        layer === "br"
          ? createBrotliDecompress()
          : layer === "deflate"
            ? createInflate()
            : createGunzip();
      const chunks: Buffer[] = [];
      let size = 0,
        settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", cancel);
        if (error) {
          decoder.destroy();
          reject(error);
        } else resolve(Buffer.concat(chunks, size));
      };
      const cancel = () => finish(signal.reason);
      signal.addEventListener("abort", cancel, { once: true });
      decoder.on("data", (chunk: Buffer) => {
        if (settled) return;
        size += chunk.length;
        if (size > maxBytes) finish(new Error("response-budget"));
        else chunks.push(chunk);
      });
      decoder.on("error", () =>
        finish(new Error("response-decompression-failed")),
      );
      decoder.on("end", () => finish());
      if (signal.aborted) cancel();
      else decoder.end(body);
    });
  }
  if (signal.aborted) throw signal.reason;
  return body;
}
