// The public demo runs the same fictional API in a browser worker. No visitor
// messages or profile changes are sent to the project owner.
import { decorate, fixtureRequest, resetFixtures } from "./kaki-demo-fixtures.js";
window.__KAKI_PUBLIC_DEMO__ = true;
const nativeFetch = window.fetch.bind(window);
const pending = new Map();
let worker;
let nextId = 0;
let latestState;

function demoWorker() {
  if (!worker) {
    worker = new Worker(new URL("./kaki-demo-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      request.resolve(new Response(data.body, {
        status: data.status,
        headers: { "Content-Type": "application/json" },
      }));
    };
    worker.onerror = () => {
      for (const request of pending.values()) request.reject(new Error("The demo could not start. Please refresh the page."));
      pending.clear();
      worker?.terminate();
      worker = undefined;
    };
  }
  return worker;
}

function send(message) {
  const run = () => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    demoWorker().postMessage({ id, ...message });
  });
  return navigator.locks ? navigator.locks.request("kaki-demo-state-v1", run) : run();
}

window.fetch = async (input, options = {}) => {
  if (typeof input === "string" && input.startsWith("/api/")) {
    const method = (options.method || "GET").toUpperCase();
    let body;
    try { body = options.body ? JSON.parse(options.body) : undefined; } catch { body = undefined; }
    const fixture = fixtureRequest(input, method, body, latestState);
    if (fixture) return new Response(JSON.stringify(fixture.body), { status: fixture.status, headers: { "Content-Type": "application/json" } });
    const response = await send({ path: input, method, body: options.body });
    if (!response.ok || !response.headers.get("Content-Type")?.includes("json")) return response;
    const payload = decorate(input, method, await response.json());
    if (input === "/api/state") latestState = payload;
    return new Response(JSON.stringify(payload), { status: response.status, headers: { "Content-Type": "application/json" } });
  }
  return nativeFetch(input, options);
};

const notice = document.createElement("details");
notice.className = "kaki-demo-notice";
notice.innerHTML = `<summary>✦ kaki demo</summary><p>Northstar is an imaginary campus. People, events, conversations and map pins are fictional. Your changes stay in this browser.</p><div><a href="/">Mobile</a><a href="/desktop.html">Desktop</a><button type="button">Reset demo</button></div><p class="demo-status" role="status"></p>`;
const style = document.createElement("style");
style.textContent = `.kaki-demo-notice{position:fixed;top:8px;left:8px;z-index:99999;color:#40386c;font:12px/1.5 system-ui,sans-serif;max-width:280px;border:1px solid #e4dff3;border-radius:14px;background:#fcfaff;box-shadow:0 3px 16px #2c225312}.kaki-demo-notice summary{padding:7px 10px;cursor:pointer;font-weight:650;list-style:none}.kaki-demo-notice summary::-webkit-details-marker{display:none}.kaki-demo-notice p{margin:0;padding:4px 12px 8px}.kaki-demo-notice div{display:flex;gap:12px;align-items:center;padding:4px 12px 12px}.kaki-demo-notice a{color:#5246a5}.kaki-demo-notice button{font:inherit;background:#eee9fb;color:#40386c;border:0;border-radius:8px;padding:7px;cursor:pointer}.kaki-demo-notice .demo-status:empty{display:none}@media(max-width:600px){.kaki-demo-notice summary{padding:5px 9px;font-size:10px}}`;
document.head.append(style);
document.body.append(notice);
notice.querySelector("button").addEventListener("click", async () => {
  if (!confirm("Reset your demo? This removes changes saved in this browser.")) return;
  const button = notice.querySelector("button");
  button.disabled = true;
  try {
    const response = await send({ action: "reset" });
    if (!response.ok) throw new Error("Reset failed. Please try again.");
    resetFixtures();
    location.hash = "#/discover";
    location.reload();
  } catch (error) {
    notice.querySelector(".demo-status").textContent = error.message;
    button.disabled = false;
  }
});
