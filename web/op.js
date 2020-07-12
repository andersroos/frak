
// To dispatcher (op strings should be exactly 16 ascii chars).
export const START = "start";
export const ABORT = "abort";
export const CONFIG = "config";

// From dispatcher, a binary websocket message is always BLOCK_COMPLETED.
export const BLOCK_STARTED =   "block-started";
export const BLOCK_COMPLETED = "block-completed";
export const ABORTED =         "aborted";
export const COMPLETED =       "completed";
