import { localRpcUrl } from "./helpers";

/** Root hook (--require); do not call `after()` at module load — Mocha is not ready yet. */
export const mochaHooks = {
  afterAll() {
    const detach =
      process.argv.includes("--detach") ||
      process.env.ANCHOR_TEST_DETACH === "1";
    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        "[local explorer]",
        `RPC: ${localRpcUrl()}`,
        "Solscan: open the [local tx] links above — each line shows label, wire format (legacy/v0), and serialized size in bytes.",
        detach
          ? "Surfpool is still running (anchor test --detach). Press Ctrl+C in that terminal when done reviewing txs."
          : "Node will stop when anchor test exits. To keep Surfpool for Solscan: npm run test:detach",
        "Stop Surfpool manually: pkill -f surfpool",
        "",
      ].join("\n")
    );
  },
};
