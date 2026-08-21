export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initConsoleLogCapture } = await import("@/lib/consoleLogBuffer");
    initConsoleLogCapture();

    // Fire-and-forget: load the credential resolver backend and populate the
    // provider OAuth cache (env -> local cache -> installed-app detection)
    // without blocking startup.
    import("@/open-sse/shared/providerCredsNode.js")
      .then((m) => m.ensureDetected())
      .catch(() => {});
  }
}
