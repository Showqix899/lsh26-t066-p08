# LICENSES.md — lsh26-t066-p08

Generated with `npx license-checker --production --summary` and cross-checked with
`npx license-checker --development --json` for the full dev/build toolchain. Full
raw output is reproducible by any judge with `npm install && npx license-checker`.

## Runtime dependencies (shipped in `dist/`)

| Package | Version | License | Notes |
|---|---|---|---|
| react | 19.2.8 | MIT | UI library |
| react-dom | 19.2.8 | MIT | React DOM renderer |
| scheduler | 0.27.0 | MIT | Transitive dependency of react-dom |

No other runtime dependency exists. The app has **no** state-management, routing,
charting, or UI-kit library — everything else (tables, badges, the print view, the
grade-distribution bars) is hand-written React + Tailwind CSS to keep the licensed
surface area small and auditable.

## Build-time / dev dependencies (never shipped)

| Package | Version | License |
|---|---|---|
| vite | 8.2.2 | MIT |
| @vitejs/plugin-react | latest | MIT |
| typescript | latest | Apache-2.0 |
| tailwindcss | 4.3.3 | MIT |
| @tailwindcss/vite | 4.3.3 | MIT |
| vitest | latest | MIT |
| eslint + plugins | latest | MIT |
| (transitive deps: glob, ISC-licensed utilities, etc.) | — | MIT / ISC / BSD-3-Clause |

## ⚠️ Flagged for organiser confirmation — `lightningcss` (MPL-2.0)

`@tailwindcss/vite` (and Vite itself, separately) pull in **lightningcss** as a
transitive **devDependency**, used only at build time to parse/transform CSS.
`lightningcss` is MPL-2.0, which is on the banned list in Section 7.

We checked `dist/` after a production build and confirmed **no lightningcss code
is present in the shipped output** — `grep -rl lightningcss dist/` returns nothing.
Only the CSS it produced (our own stylesheet) ships. This is the same category as
a compiler's own license not attaching to the programs it compiles, but the
rulebook doesn't explicitly carve out build-only tooling the way it does for the
MongoDB Atlas case, so **this is a judgment call, not a certainty** — please
confirm in Discord before relying on it, mirroring the MongoDB Atlas question in
the hackathon prep notes.

**Fallback if organisers rule against build-time MPL deps:** swap to Tailwind CSS
v3 with the classic `postcss` + `autoprefixer` pipeline (both MIT), which does not
depend on lightningcss. This is a config-only change (`tailwind.config.js` +
`postcss.config.js`) and does not touch any application code — see
`known_limitations` in `evaluation-manifest.json`.

## Fonts

Loaded at runtime from Google Fonts (`fonts.googleapis.com`), not vendored into
the repo or bundle:

| Font | License |
|---|---|
| Newsreader | OFL-1.1 (SIL Open Font License) |
| Inter | OFL-1.1 |
| IBM Plex Mono | OFL-1.1 |

OFL is not on the banned list and is not copyleft in the code sense — it applies
to the font files themselves, which are never redistributed as part of this
repository.

## Sample data

`public/fixtures.json` is the organiser-supplied public fixture file
(`P08_school_results_public.json`), used as-is under the terms of the hackathon
itself. It is not third-party code and carries no separate license of its own.

## Declaration

No AGPL, GPL, LGPL, or SSPL-licensed code is used anywhere in this repository,
runtime or build-time. The one MPL-licensed package is flagged above with full
transparency rather than omitted.
