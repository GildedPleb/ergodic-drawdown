/**
 * ADR-002 script rules (R1, R2, R4 vars, R5, R7, R9, R10, R11) and the G4 extras, each with seeded
 * violations that must go red. One entry file so the suite pays the parser start-up once (G4 budget).
 * stylelint core rules (R3, R4 values, R6, R8, R9 properties) run in `bun run lint` (CI check job):
 * see scripts/v2/css/stylelint-gate.ts.
 */
import "./modules.cases";
import "./layers.cases";
import "./vars.cases";
import "./tiers.cases";
import "./variants.cases";
import "./motion.cases";
import "./inline-style.cases";
import "./size.cases";
import "./elements.cases";
