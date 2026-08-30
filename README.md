# lsh26-t066-p08 — School Result Processing & GPA Engine

**Live URL:** [https://lsh26-t066-p08.vercel.app/](https://lsh26-t066-p08.vercel.app/) &nbsp;·&nbsp;

**Team:** LSH26-T066 &nbsp;·&nbsp; **Problem:** P08 &nbsp;·&nbsp; **Event:** LofiStack Hackathon 2026

> Naming note: the team ID is written here as `LSH26-T066` / `lsh26-t066-p08`,
> matching the format specified in the rulebook (`LSH26-T###` / `lsh26-t###-p##`).
> Flag us if the registered ID differs.

## What it does

A tool that takes raw student marks and produces the same final result every
time — subject grade points, final GPA, letter grade — and shows exactly which
rule and which number produced each outcome, so a wrong entry can be caught
before results go out.

Built against the published clarifications R-10 through R-13 and R-29 only; no
other grading rules were used.

**Required items (1–4), all implemented:**

1. **Roster** — the app loads the organiser-published fixture (`PUB-01`: 80
   students across two classes, six compulsory subjects + one optional
   subject each) by default. All 25 published fixture cases are selectable
   from the header. PUB-01 already contains every required edge case: a
   failed subject with a strong average, a practical fail with a passing
   theory mark, an optional subject below the point where it helps, and
   students absent in one subject — see `src/engine/rules.test.ts` for the
   specific students used to verify each case by hand.
2. **Result calculation** — `src/engine/rules.ts` computes a grade point for
   every subject, then the final GPA and letter grade, following R-10–R-13
   exactly.
3. **Per-student trace** — the "Student trace" tab shows, for every subject,
   the mark used, the grade point it produced, and the rule that decided it,
   phrased with that student's real numbers (never a generic explanation).
   The subject(s) responsible for a compulsory failure are circled in red,
   the way a teacher would mark the number that needs checking.
4. **Checking lists** — the "Checking lists" tab produces the three office
   lists defined in R-29 (optional-subject, practical-fail, absent), with a
   plain-English reason per student. A student can and does appear on more
   than one list.

**Bonus features attempted (all three):**

- **Upload / validate** — paste or upload a JSON marks file in the same
  shape as the fixture; rows are validated and rejections are reported with
  the actual bad value quoted (`src/engine/validate.ts`).
- **Class summary** — pass rate, grade distribution, and the subject that
  failed the most students, per class.
- **Printable marksheet** — "Print this marksheet" on the trace view uses a
  print stylesheet (`@media print` in `src/index.css`) to produce a clean,
  single-student printout.

## How to run

```bash
npm install
npm run dev       # starts Vite dev server, usually http://localhost:5173
```

To reproduce the production build used for the live URL:

```bash
npm run build      # type-checks then builds to dist/
npm run preview    # serves dist/ locally to sanity-check before deploying
```

To run the engine's unit tests:

```bash
npx vitest run
```

No environment variables, database, or backend service are required. The app
is a static site: `npm run build` produces a `dist/` folder that can be
deployed as-is to Vercel/Netlify/Render/Cloudflare Pages/any static host.

## What's mocked / what's real

- **Grading logic** is fully real — not a stub. It is unit-tested against
  hand-calculated values, including real students pulled from the published
  fixture (see the test names in `src/engine/rules.test.ts`).
- **Data is not persisted anywhere.** There is no database and no backend.
  Sample data is a static JSON file (`public/fixtures.json`, the organiser's
  own published fixture) fetched once at page load; switching cases or
  uploading a file only changes in-memory React state for that browser tab.
  Refreshing the page reloads the default fixture from scratch — this is
  also the "reset" mechanism (see `evaluation-manifest.json` →
  `sample_data.reset_instructions`).
- **The upload/validate bonus feature** accepts a file and validates+loads it
  into the running app; it does not write anything back to disk or a server.

## What we'd build next

- Server-side persistence for a real "office" workflow (save corrected marks,
  audit trail of who changed what) — out of scope for a static, zero-setup
  judge experience, but the natural next step if this became a real tool.
- CSV import in addition to JSON, since a real school more likely exports
  from a spreadsheet than hand-writes JSON.
- Per-class configurable compulsory-subject lists (currently one compulsory
  list per case, matching the fixture shape) to support boards where
  compulsory subjects vary between classes.

## Design decisions

- **No router.** The app is five views over one in-memory dataset. A client
  router would add a dependency and a URL-sync layer without changing what
  the app does; plain `useState` for the active tab is simpler and just as
  testable at this scope.
- **No chart library.** The class-summary grade distribution is a handful of
  bars, hand-rolled as styled `<div>`s, to avoid pulling in Chart.js/Recharts
  for four bars and to keep the visual language (ledger, hairline rules,
  monospaced numerals) consistent everywhere rather than switching styles
  inside a chart component.
- **Fixture served as a static asset, not bundled into JS.** `public/
  fixtures.json` is fetched at runtime instead of `import`-ed, so the ~1.1 MB
  organiser fixture doesn't inflate the JS bundle judges have to download.
- **Absence (`"AB"`) is a distinct value from `0` everywhere in the type
  system** (`RawMark = number | "AB" | {theory, practical}`), not a
  post-hoc special case, per the problem's own constraint that the two must
  never produce the same output.

## AI tool use

See `ai_tools_used` in `evaluation-manifest.json` for the declared breakdown.
