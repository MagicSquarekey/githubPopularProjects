/**
 * Next.js instrumentation — runs once when the server starts.
 *
 * Node's built-in fetch does not honor the OS/system proxy settings, so on
 * networks where github.com is only reachable through a local proxy (common
 * in mainland China), server-side trending scrapes fail intermittently.
 * When HTTPS_PROXY/HTTP_PROXY is set, route every outbound request through
 * that proxy. Leave the variable unset in deployments with direct access
 * (e.g. an overseas Ubuntu server).
 *
 * `undici` is imported statically on purpose: a dynamic import was not
 * picked up by Next's standalone file tracing, so Docker images were
 * missing the package and proxy support silently degraded to direct.
 */
import { ProxyAgent, setGlobalDispatcher } from "undici";

export async function register() {
  const proxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (!proxy) return;

  try {
    setGlobalDispatcher(new ProxyAgent(proxy));
    console.log(`[proxy] outbound requests via ${proxy}`);
  } catch (err) {
    console.warn("[proxy] failed to configure proxy, using direct connection:", err);
  }
}
