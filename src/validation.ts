import { z } from "zod";

// feature_status `name`: bounded length and safe characters only. Allows tolerant path
// inputs like "specs/001-ledger-status/tasks.md" while rejecting spaces, control chars,
// and oversized payloads (which previously got echoed back in error responses).
export const featureNameSchema = z
  .string()
  .max(256, "feature name too long")
  .regex(/^[\w./-]*$/, "feature name has invalid characters");
