const DEFAULT_BASE_URL = "https://simplebsv.codenlighten.org";

function getBaseUrl() {
  return process.env.SIMPLEBSV_BASE_URL || DEFAULT_BASE_URL;
}

function getApiKey() {
  const key = process.env.SIMPLEBSV_API_KEY;
  if (!key) {
    throw new Error("SIMPLEBSV_API_KEY is required for BSV publishing.");
  }
  return key;
}

async function request(path, body, { wait = false } = {}) {
  const url = new URL(`${getBaseUrl()}${path}`);
  if (wait) {
    url.searchParams.set("wait", "true");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getApiKey()}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error || data?.message || "BSV API request failed";
    throw new Error(message);
  }

  return data;
}

export async function publishText(text, options = {}) {
  return request("/publish/text", {
    text,
    mediaType: "text/plain",
    encoding: "utf-8"
  }, options);
}

export async function publishJson(json, options = {}) {
  return request("/publish/json", { json }, options);
}
