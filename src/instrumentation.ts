/**
 * Next.js instrumentation — runs once when the server starts.
 *
 * Node's built-in fetch does not honor the OS/system proxy settings, so on
 * networks where github.com is only reachable through a local proxy (common
 * in mainland China), server-side trending scrapes fail intermittently.
 * When HTTPS_PROXY/HTTP_PROXY is set, route every outbound request through
 * that proxy. Leave the variable unset in deployments with direct access.
 */
export async function register() {
  const proxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (!proxy) return;

  try {
    const { setGlobalDispatcher, ProxyAgent } = await import("undici");
    setGlobalDispatcher(new ProxyAgent(proxy));
    console.log(`[proxy] outbound requests via ${proxy}`);
  } catch (err) {
    console.warn("[proxy] failed to configure proxy, using direct connection:", err);
  }
}
