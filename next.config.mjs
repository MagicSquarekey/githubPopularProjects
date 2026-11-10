const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // Next's file tracing does not pick up `undici` (used by
  // src/instrumentation.ts for HTTPS_PROXY support), so Docker images built
  // from the standalone output would miss it. Include it explicitly.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/undici/**/*"],
  },
};

export default nextConfig;
