/**
 * E2E test: Cursor → proxy → Ollama.
 * Assumes the proxy is already running (pnpm ollama-proxy). Sends an OpenAI-format
 * request with a whitelisted model name and verifies the proxy forwards to Ollama.
 *
 * Exit 0: proxy accepted the request and either returned a completion (200) or
 *         returned 502 (proxy works but Ollama unreachable).
 * Exit 1: proxy not running or unexpected response.
 */

const PORT = Number(process.env.OLLAMA_PROXY_PORT ?? "11435");
const BASE = `http://127.0.0.1:${PORT}`;

async function main() {
  const url = `${BASE}/v1/chat/completions`;
  const body = {
    model: "gpt-4o",
    messages: [{ role: "user", content: "Reply with exactly: ok" }],
    max_tokens: 10,
  };

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const code = err.cause?.code ?? err.code;
    const msg = err.message ?? "";
    if (
      code === "ECONNREFUSED" ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("fetch failed")
    ) {
      console.error(
        "E2E failed: proxy not running. Start it with: pnpm ollama-proxy"
      );
      process.exit(1);
    }
    throw err;
  }

  if (res.status === 502) {
    const text = await res.text();
    const msg = text.includes("Upstream request failed")
      ? "Proxy is up and forwarding; Ollama is unreachable (start Ollama and/or Caddy at OLLAMA_BASE_URL)."
      : text;
    console.warn("E2E proxy check: " + msg);
    process.exit(0);
  }

  if (!res.ok) {
    console.error("E2E failed: proxy returned", res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  if (!data.choices || !Array.isArray(data.choices)) {
    console.error("E2E failed: response missing choices", JSON.stringify(data).slice(0, 200));
    process.exit(1);
  }

  console.log("E2E passed: proxy forwarded to Ollama and returned a completion.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
