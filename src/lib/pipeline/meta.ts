import "server-only";
import { UserFacingError, type PipelineConfig } from "./config";

const FILE_EXPIRY_SECONDS = 3600;
const MAX_ATTEMPTS = 3;

export type ModelUsage = {
  model: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  searchQueries: number;
};

export type ModelResult = {
  text: string;
  usage: ModelUsage;
  sources: string[];
};

type OutputPart = { type?: string; text?: string };
type OutputItem = {
  type?: string;
  content?: OutputPart[];
  action?: { queries?: string[]; sources?: { url?: string }[] };
  results?: { url?: string }[];
};
type FinalResponse = {
  status?: string;
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output?: OutputItem[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
  };
};

/** An unfinished response is still billed, so it carries its usage for the budget. */
export class ModelIncompleteError extends Error {
  constructor(message: string, readonly usage: ModelUsage) {
    super(message);
  }
}

const pause = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });

const isRetryable = (status: number) => status === 429 || status >= 500;

export async function uploadVideo(config: PipelineConfig, video: Blob, signal: AbortSignal) {
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("expires_after[anchor]", "created_at");
  form.append("expires_after[seconds]", String(FILE_EXPIRY_SECONDS));
  form.append("file", video, "reel.mp4");

  const response = await fetch(`${config.apiBase}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: form,
    signal,
  });
  if (!response.ok) throw new Error(`Meta file upload failed with HTTP ${response.status}`);
  const file = (await response.json()) as { id?: string };
  if (!file.id) throw new Error("Meta file upload returned no file id");
  return file.id;
}

export async function deleteVideo(config: PipelineConfig, fileId: string) {
  const response = await fetch(`${config.apiBase}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Meta file delete failed with HTTP ${response.status}`);
  }
}

async function readFinalResponse(body: ReadableStream<Uint8Array>): Promise<FinalResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: FinalResponse | null = null;

  const handle = (block: string) => {
    const data = block.split(/\r?\n/).find((line) => line.startsWith("data: "))?.slice(6);
    if (!data || data === "[DONE]") return;
    const event = JSON.parse(data) as { type?: string; response?: FinalResponse; message?: string };
    if (event.type === "error") throw new Error(`Meta stream error: ${event.message ?? "unknown"}`);
    if (
      event.response &&
      (event.type === "response.completed" || event.type === "response.incomplete" || event.type === "response.failed")
    ) {
      final = event.response;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(handle);
    if (done) break;
  }
  if (buffer.trim()) handle(buffer);
  if (!final) throw new Error("Meta stream ended without a final response");
  return final;
}

function toResult(final: FinalResponse, model: string): ModelResult {
  const output = final.output ?? [];
  const searches = output.filter((item) => item.type === "web_search_call");
  const billed = final.usage ?? {};
  const usage: ModelUsage = {
    model,
    inputTokens: billed.input_tokens ?? 0,
    cachedTokens: billed.input_tokens_details?.cached_tokens ?? 0,
    outputTokens: billed.output_tokens ?? 0,
    searchQueries: searches.reduce((sum, item) => sum + (item.action?.queries?.length ?? 1), 0),
  };

  if (final.status !== "completed") {
    const reason = final.error?.message ?? final.incomplete_details?.reason ?? final.status;
    throw new ModelIncompleteError(`Meta response did not complete: ${reason}`, usage);
  }

  // With search, earlier messages can be commentary. The answer is the last one.
  const text = output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .at(-1);
  if (!text) throw new Error("Meta response contained no text");

  const sources = searches
    .flatMap((item) => [...(item.results ?? []), ...(item.action?.sources ?? [])])
    .map((source) => source.url)
    .filter((url): url is string => Boolean(url));

  return { text, sources, usage };
}

export async function createResponse(
  config: PipelineConfig,
  body: Record<string, unknown> & { model: string },
  signal: AbortSignal,
): Promise<ModelResult> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${config.apiBase}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, store: false, stream: true }),
      signal,
    });

    if (response.ok && response.body) {
      return toResult(await readFinalResponse(response.body), body.model);
    }
    if (attempt >= MAX_ATTEMPTS || !isRetryable(response.status)) {
      const detail = (await response.text()).slice(0, 300);
      console.error(`Meta request failed with HTTP ${response.status}: ${detail}`);
      if (response.status === 402 || response.status === 401 || response.status === 403) {
        throw new UserFacingError("Tick can’t reach its AI right now. Please try again later.");
      }
      throw new Error(`Meta request failed with HTTP ${response.status}`);
    }
    await pause(1000 * 2 ** attempt, signal);
  }
}

export function costOf(config: PipelineConfig, usage: ModelUsage) {
  const fresh = Math.max(0, usage.inputTokens - usage.cachedTokens);
  return (
    (fresh * config.priceInput + usage.cachedTokens * config.priceCached + usage.outputTokens * config.priceOutput) / 1e6 +
    (usage.searchQueries * config.priceSearch) / 1000
  );
}
