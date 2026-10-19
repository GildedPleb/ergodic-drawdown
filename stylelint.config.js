/** @type {import("stylelint").Config} */
export default {
  // Mechanical enforcement for Phase 0 runs in scripts/v2/css-enforce.ts (merge gate).
  // Install stylelint later for editor integration; do not drop Keel rules.
  defaultSeverity: "error",
  rules: {},
};
