# Aman Coach — Plan to Become a Bulletproof, Scalable, World-Class Product
Written 2026-07-27. Companion to `PRD.md` (feature/business decisions) and the Athletic Editorial redesign notes.

This is written the way a design director with decades of shipping consumer products would brief a small team: no jargon for its own sake, every recommendation tied to something real in this codebase, nothing added "because best practice says so" if it doesn't earn its keep for a solo-coach app that might grow into a multi-coach one.

---

## 1. Architecture — built to outgrow one client

**Where it stands today:** the app already has the right bones — a `clients` table with `coach_id`, Supabase auth with role read from `profiles`, Row Level Security. It was built for one coach (Aman) but the schema doesn't hardcode that. The gap isn't "rebuild it" — it's tightening what's already there so it doesn't crack under a second, third, or fiftieth coach.

**Known cracks to fix first (these will only get more expensive to fix later):**
- The Clients List / dashboard counts intermittently return 0 rows on the `clients` + `profile:profiles(*)` embedded query — a suspected RLS/PostgREST join issue, confirmed pre-existing. At one coach this is an annoyance; at ten coaches it's a support ticket every day. Fix by testing the RLS policy directly in the Supabase SQL editor with `EXPLAIN` against a real `coach_id`, and consider replacing the embedded join with two explicit queries if PostgREST's join-planner keeps being flaky — simpler and more predictable beats clever.
- Deploys are manual (`npx vercel --prod --yes`, someone has to remember to run it). At one coach, a missed deploy means Aman sees stale content for a day. At scale it means a paying customer's bug fix silently never ships. Wire up Vercel's GitHu

b integration so `main` auto-deploys on push, with the build required to pass before merge — turns "did someone remember" into "the pipeline handles it."
- The build has already broken once this week from an unguarded environment variable check running at module load time (`SETUP_SECRET`) instead of inside the request handler — fixed, but it's a pattern worth a rule: **never throw at module scope in an API route**, always inside the handler. One bad top-level throw takes down the entire deploy, not just that one route.

**Making it actually multi-tenant-ready (do this before it's needed, not after):**
- Every table that has a `coach_id` should have an RLS policy that scopes by it — audit this once, in one sitting, rather than discovering a leak later. The `get_owner_object()` pattern used by wger (a mature open-source fitness platform) is worth adopting conceptually: one function per table that resolves "who owns this row," so every policy calls the same logic instead of five slightly-different copies drifting out of sync.
- Don't build a full multi-tenant "organization" system speculatively — that's the over-engineering trap. A `coach_id` foreign key is enough for "many coaches, each with their own clients." Only add an `organizations`/gym-level table if and when a gym (not an individual coach) becomes a customer.
- Package/pricing logic currently lives as a hardcoded 15-item list in `AddClientModal.tsx`. Fine for one coach's fixed offerings; if this becomes a product other coaches configure themselves, that list needs to move into a `coach_packages` table each coach can edit. Don't build that table yet — just don't add more hardcoded coach-specific logic in new features from here on, so the eventual migration is small.

**Data model — borrow the good parts, skip the enterprise parts:**
From researching wger and watt-mind/coach (see the memory notes from this session): a `CoachingRelationship` join table (coach_id, athlete_id, unique pair) is a cleaner shape than baking "coach" and "client" into separate hardcoded tables — worth adopting *if and when* the app needs a person to be both a coach and someone else's client. Not needed today. What *is* worth adopting now: a generalized `measurement_category` + `measurement` pair instead of hardcoding new columns every time a new body metric is tracked (waist, bicep, etc.) — cheap to add today, saves a migration later.

---

## 2. Visual design — striking, but tested, not guessed

**Where it stands:** black `#0A0A0A` background, gold `#FFB800` accent — a strong, ownable identity already. The redesign in progress ("Athletic Editorial": Fraunces serif numerals, hairline-divided layout, film grain, real photography) moves it from generic-AI-app territory toward something that looks designed, not templated.

**Testing the current palette before adding anything to it:**
1. **Contrast audit first.** Gold-on-black and white-on-black both need checking against WCAG AA (4.5:1 for body text, 3:1 for large text) — run every text/background pairing through a contrast checker before shipping each page, not at the end. A beautiful palette that fails accessibility isn't world-class, it's exclusionary.
2. **Real-device check, not just a laptop screen.** OLED phones render true black differently from LCD, and gold can shift warm/orange under different phone color profiles. Check on at least one iPhone and one mid-range Android before calling a screen done.
3. **Reduce before you add.** Right now there are scattered near-duplicate grays across the codebase (`bg-bg-card`, `bg-bg-elevated`, various `rgba(255,255,255,0.0x)` glass tints). Consolidate to the smallest set of tokens that still reads as intentional depth — fewer, more deliberate shades look more premium than many similar ones, and it's less for a future coach-brand color to fight against.

**When (and only when) to add a new color:**
- Add a color only to carry *meaning* the existing palette can't (e.g., a genuine error state, a genuine success confirmation) — never for decoration. The dashboard's old "Active" badge in green was decoration pretending to be a signal; that's the trap to avoid repeating.
- If a semantic color is needed (success/warning/error), pick it to sit comfortably next to gold on black — test it in the same screenshot as the gold accent before committing, since a color that looks fine alone can clash badly next to a strong existing accent.
- Never add a second "hero" accent color competing with gold. One dominant accent, used with restraint, reads more expensive than two.

---

## 3. Features that create real engagement (not just decoration)

Grounded in the repo research from this session — concrete, buildable ideas, not generic "add gamification" advice:

- **Real, computed trend badges — never invented ones.** wger's dashboard computes trend deltas from actual 7-day-average first/last values; the old version of this app's dashboard had a hardcoded fake "+18% YoY" badge that meant nothing. A number the client can trust is worth more than a number that looks exciting. This is already partly fixed in the redesign in progress — keep enforcing it as new stat cards get added.
- **Streaks, done simply.** A correct streak counter (union of check-in dates, check today-or-yesterday, walk backward day by day) is a small amount of logic that drives real daily-open behavior — proven pattern, cheap to build, no dependency needed.
- **Progress you can actually feel.** A scrubbable weight/measurement chart — drag a finger across the line, see any past day's number, with a dashed line showing the goal — reads far more premium than a static sparkline, and it's genuinely more useful to a client checking "how am I doing against my goal." This is the single highest-leverage visual feature to build next, on the client Progress page.
- **Score with its reason, not just a number.** Pairing a stat with a one-line explanation (why is Adherence 82% this week — which check-ins pulled it down) is what separates a coaching app from a generic fitness tracker. Coaches already write feedback; surface it next to the number it explains instead of burying it in a separate screen.
- **Calendar-style adherence view.** A simple month grid, filled/unfilled per day a client checked in — instantly readable, no explanation needed, and it visually rewards consistency the way a habit-tracker app does.

**What NOT to build**, because it's effort without payoff for this app's actual size:
- A full XP/leveling system with tiers and badges — fun in a mass-market consumer app with thousands of anonymous users competing; low value in a personal one-coach-many-clients relationship where the coach *is* the motivation. If ever added, keep the math (there's a clean, simple formula worth reusing) but skip building a whole meta-game around it.
- AI-generated check-in questions / dynamic forms — interesting pattern seen in one researched app, but it solves a problem (infinite form variety at massive scale) this app doesn't have. Aman's fixed, carefully written questionnaire is already good; don't make it "smarter" at the cost of being unpredictable.

---

## 4. Performance, reliability, and staying solid at scale

- **Fix the flaky query before adding more screens on top of it.** New features built on top of an already-flaky Clients query just multiply the number of places that break.
- **Turn on real monitoring before it's needed, not after the first outage.** Vercel's built-in analytics plus a lightweight error tracker (Sentry's free tier is enough at this size) catches a broken deploy or a silent API failure before a client notices — right now the only signal is "someone complains."
- **Images are the easiest performance win available.** Client progress photos and Aman's brand photography should go through Next.js's built-in image optimization (`next/image`) rather than raw `<img>` tags wherever that isn't already the case — automatic resizing and lazy-loading, and it's a few lines, not a project.
- **Database indexes on every foreign key that gets filtered often** — `coach_id` on clients, `client_id` on checkins/fees. Cheap to add now, expensive to discover missing once there are thousands of rows and a query that used to feel instant starts taking seconds.
- **Local dev stability is a real productivity leak, not a footnote.** `npm run dev` has died unpredictably ~10+ times across recent sessions in this environment. Worth an hour once to root-cause (memory limit? file-watcher limit on Windows?) rather than continuing to eat the restart cost every session indefinitely.
- **Treat "it built successfully" and "it works" as two different facts.** The recent production outage happened *because* a build passed locally but a specific route crashed only under Vercel's page-data-collection step. Add a `vercel build` (or a CI step that mirrors production build conditions) before merging, not just `next dev` working.

---

## 5. Simple, prioritized steps — do these in order

Small, safe steps beat one giant rewrite. In priority order:

1. **Stabilize what exists.** Fix the Clients query flakiness. Turn on auto-deploy so shipped code actually goes live. Add the `vercel build` pre-merge check. *(This protects everything built after it.)*
2. **Finish the design system on one page well**, rather than half-doing it everywhere. The coach dashboard is the current test case — get it fully right (including the Recent Check-ins section still mid-migration), screenshot-check it on a real phone, then use it as the template for the other 11 pages.
3. **Roll the design system out page by page**, confirming as you go rather than batch-changing everything and hoping. Each page is a small, reviewable, revertible step.
4. **Add the one highest-leverage engagement feature**: the scrubbable progress chart with a goal line, on the client Progress page. This is the single feature most likely to make a client feel the app is premium.
5. **Add monitoring and indexes** — invisible to the client, but this is what keeps step 2-4's polish from being undone by a slow or broken app six months from now.
6. **Only then** consider anything from the "future, if it's actually needed" list — multi-coach data model, package configurability, gamification. Building these before there's a second coach is solving a problem that doesn't exist yet at the cost of one that does.

---

## 6. The 50-years-of-doing-this-badly-and-well perspective

A few hard-earned truths worth keeping visible on the wall for this project:

- **The apps that feel expensive are the ones that removed things, not the ones that added things.** Every fake badge, every extra icon, every color that doesn't mean anything is a small tax on how premium the whole product feels. The redesign work already underway — stripping out decorative badges, icon bubbles, and glow effects — is the right instinct; keep applying it ruthlessly to every new screen, not just the dashboard.
- **Consistency beats cleverness.** A user trusts an app the moment every screen behaves the way the last one taught them to expect. Finish the design system fully before adding a single new clever interaction — half a beautiful system reads as more broken than a plain, complete one.
- **Real data beats decoration every time.** A plain number that's true will always out-perform an exciting number that's fake, because clients eventually notice, and the moment they do, they stop trusting every number in the app — not just the one that was wrong.
- **Scale-readiness is a discipline, not a rewrite.** The best-scaling products didn't predict every future need — they just consistently avoided painting themselves into corners (hardcoded IDs, missing indexes, ownership logic copy-pasted five different ways). Do that consistently and the app will still be extensible in two years without ever needing a "big rewrite."
- **Ship the boring fix before the exciting feature.** The instinct is always to build the delightful new thing. The instinct that actually protects a product long-term is fixing the flaky query first. Both matter — but only one of them is silently costing trust with every use of the app right now.
