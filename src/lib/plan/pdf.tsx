// Aman's plan PDF. Same structure as his Google Docs plans (header table, rules pages,
// day tables / meal tables, red banners, linked products and videos), cleaner look.
import { Document, Page, View, Text, Link, Image, Font, StyleSheet, Svg, Polygon, pdf } from "@react-pdf/renderer"
import type { Style } from "@react-pdf/types"
import type { ReactNode } from "react"
import { format } from "date-fns"
import {
  tokenize,
  calcAge,
  cardioBpm,
  type PlanDoc,
  type PlanDocData,
  type WorkoutDay,
  type WorkoutRow,
  type DietPlan,
  type DietRow,
} from "./types"
import exerciseDb from "./exercise-db.json"

const C = {
  ink: "#16130F",
  soft: "#4A443C",
  mute: "#8A8378",
  rule: "#E6DFD3",
  paper: "#FFFDF8",
  tint: "#FBF3E7",
  band: "#0B0B0B",
  orange: "#E8590C",
  red: "#D92D20",
  link: "#B4470B",
}

let fontsReady = false
function registerFonts(assetBase: string) {
  if (fontsReady) return
  const base = assetBase + "/fonts/plan/"
  Font.register({
    family: "Fraunces",
    fonts: [
      { src: base + "Fraunces-Bold.ttf", fontWeight: 700 },
      { src: base + "Fraunces-SemiBoldItalic.ttf", fontWeight: 600, fontStyle: "italic" },
    ],
  })
  Font.register({
    family: "DMSans",
    fonts: [
      { src: base + "DMSans-Regular.ttf", fontWeight: 400 },
      { src: base + "DMSans-SemiBold.ttf", fontWeight: 600 },
      { src: base + "DMSans-Bold.ttf", fontWeight: 700 },
      { src: base + "DMSans-Italic.ttf", fontWeight: 400, fontStyle: "italic" },
      { src: base + "DMSans-BoldItalic.ttf", fontWeight: 700, fontStyle: "italic" },
    ],
  })
  Font.registerHyphenationCallback((w) => [w])
  fontsReady = true
}

const s = StyleSheet.create({
  page: {
    backgroundColor: C.paper,
    paddingTop: 34,
    paddingBottom: 52,
    paddingHorizontal: 34,
    fontFamily: "DMSans",
    fontSize: 9.5,
    color: C.ink,
    lineHeight: 1.38,
  },
  band: {
    backgroundColor: C.band,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 16,
  },
  logo: { width: 66, height: 66, marginRight: 16 },
  bandTitle: {
    fontFamily: "Fraunces",
    fontStyle: "italic",
    fontWeight: 600,
    fontSize: 26,
    color: "#FFFFFF",
    lineHeight: 1.1,
  },
  bandTag: { color: C.orange, fontWeight: 700, fontSize: 10, letterSpacing: 1.6, marginTop: 4 },
  bandPeriod: { color: "#BDB6AA", fontSize: 9.5, marginTop: 3 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.6,
    borderTopColor: C.rule,
    paddingTop: 6,
    fontSize: 8,
    color: C.mute,
  },
  h2: { fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 600, fontSize: 17, color: C.orange, marginBottom: 8 },
  card: { borderWidth: 0.8, borderColor: C.rule, borderRadius: 8, marginBottom: 12, overflow: "hidden" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap" },
  infoCell: {
    width: "50%",
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: C.rule,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  infoLabel: { width: "52%", color: C.mute, fontSize: 8.5 },
  infoValue: { width: "48%", fontWeight: 700 },
  th: {
    backgroundColor: C.band,
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 8.5,
    letterSpacing: 0.8,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tr: { flexDirection: "row", borderTopWidth: 0.6, borderTopColor: C.rule },
  td: { paddingVertical: 6, paddingHorizontal: 8 },
  dayHead: { flexDirection: "row", alignItems: "baseline", marginBottom: 9, marginTop: 6 },
  dayNo: { color: C.orange, fontWeight: 700, fontSize: 9, letterSpacing: 1.6, marginRight: 8 },
  dayTitle: { fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 600, fontSize: 18 },
  note: { color: C.red, fontSize: 8, fontWeight: 600, letterSpacing: 0 },
  banner: {
    backgroundColor: C.tint,
    color: C.red,
    fontWeight: 700,
    textAlign: "center",
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  num: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.orange,
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 3,
    marginRight: 7,
  },
  numGroup: {
    width: 22,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.orange,
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 3,
    marginRight: 7,
  },
  exName: { fontWeight: 700, fontSize: 10.5 },
  pill: {
    borderWidth: 0.8,
    borderColor: C.link,
    borderRadius: 9,
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    marginRight: 4,
    marginTop: 4,
    fontSize: 7.5,
    color: C.link,
    fontWeight: 700,
    textDecoration: "none",
  },
  bullet: { flexDirection: "row", marginTop: 2 },
  // Rules / cardio pages
  rulesBand: { backgroundColor: C.band, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginTop: 4, marginBottom: 12 },
  rulesBandTitle: { fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 600, fontSize: 19, color: "#FFFFFF", lineHeight: 1.15 },
  rulesBandBar: { width: 36, height: 3, borderRadius: 2, backgroundColor: C.orange, marginTop: 7 },
  ruleCard: { borderWidth: 0.8, borderColor: C.rule, borderRadius: 8, marginBottom: 10, backgroundColor: "#FFFFFF" },
  ruleCardHead: { flexDirection: "row", alignItems: "center", backgroundColor: C.tint, borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingVertical: 7, paddingHorizontal: 12, marginBottom: 6 },
  ruleNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.orange, color: "#FFFFFF", fontSize: 9.5, fontWeight: 700, textAlign: "center", paddingTop: 3.5, marginRight: 9 },
  ruleCardTitle: { flex: 1, fontWeight: 700, fontSize: 10.5, letterSpacing: 0.9, color: C.ink },
  ruleBullet: { flexDirection: "row", marginTop: 4, fontSize: 10, lineHeight: 1.5 },
  ruleSub: { fontWeight: 700, fontSize: 9.5, color: C.orange, letterSpacing: 0.6, marginTop: 9, marginBottom: 1 },
  ruleCallout: { backgroundColor: C.tint, borderLeftWidth: 2.5, borderLeftColor: C.orange, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 9, marginTop: 7, fontSize: 10, lineHeight: 1.5 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  chip: { width: "33.33%", flexDirection: "row", paddingVertical: 2.5, paddingRight: 6, fontSize: 10 },
  statCard: { flexDirection: "row", alignItems: "stretch", borderWidth: 0.8, borderColor: C.rule, borderRadius: 8, marginBottom: 8, backgroundColor: "#FFFFFF" },
  statLeft: { width: 92, backgroundColor: C.tint, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 6 },
  statValue: { fontFamily: "Fraunces", fontWeight: 700, fontSize: 19, color: C.orange, lineHeight: 1.05, textAlign: "center" },
  statUnit: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1.4, color: C.soft, marginTop: 3 },
  statText: { flex: 1, paddingVertical: 9, paddingHorizontal: 11, fontSize: 10, lineHeight: 1.5, color: C.ink },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.orange, marginTop: 5, marginRight: 6 },
  sets: { fontWeight: 700, textAlign: "center", fontSize: 9.5 },
  setMetaPill: {
    fontSize: 7,
    fontWeight: 700,
    color: C.soft,
    backgroundColor: "#F3EFE9",
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 4,
    marginHorizontal: 1.5,
    marginTop: 2,
  },
})

/** *red* and [label](url) inside any text. forceRed = changed since the copied plan. */
function Rich({ text, forceRed, style }: { text: string; forceRed?: boolean; style?: Style | Style[] }) {
  return (
    <Text style={style}>
      {tokenize(text).map((t, i) => {
        const color = t.red || forceRed ? C.red : undefined
        if (t.url)
          return (
            <Link key={i} src={t.url} style={{ color: color ?? C.link, textDecoration: "underline" }}>
              {t.text}
            </Link>
          )
        return (
          <Text key={i} style={color ? { color } : undefined}>
            {t.text}
          </Text>
        )
      })}
    </Text>
  )
}

function Bullets({
  lines,
  changed,
}: {
  lines: { text: string; key: string }[]
  changed: (k: string, t: string) => boolean
}) {
  return (
    <>
      {lines.map((l) => (
        <View key={l.key} style={s.bullet} wrap={false}>
          <View style={s.dot} />
          <Rich text={l.text} forceRed={changed(l.key, l.text)} style={{ flex: 1, color: C.soft }} />
        </View>
      ))}
    </>
  )
}

/** "*CARDIO, STEPS & BREATHING*" = page title band. */
function RulesBand({ text }: { text: string }) {
  return (
    <View style={s.rulesBand} wrap={false}>
      <Text style={s.rulesBandTitle}>{text}</Text>
      <View style={s.rulesBandBar} />
    </View>
  )
}

/** First "56000 Steps" / "90 minutes" / "130-140 bpm" in a cardio line, shown big on its card. */
function cardioStat(t: string): { value: string; unit: string } | null {
  const m = t.match(/(\d[\d,.]*(?:\s*-\s*\d[\d,.]*)?)\s*(steps|minutes|mins?|bpm)\b/i)
  if (!m) return null
  const per = /per\s+week/i.test(t) ? " / WEEK" : /every\s*day|per\s+day|daily/i.test(t) ? " / DAY" : ""
  return { value: m[1].replace(/\s+/g, ""), unit: m[2].toUpperCase() + per }
}

type RuleLine = { t: string; i: number }
const isTitleLine = (t: string) => /^\*[^*]+\*$/.test(t) && t === t.toUpperCase()
const isSectionLine = (t: string) => /^(\d+)\.\s*(.+:)$/.test(t)
// Short name like "Broccoli" or "Green Peas (use less)": 3 words or fewer outside brackets
const isChip = (t: string) =>
  t.startsWith("- ") && !t.endsWith(":") && t.slice(2).replace(/\([^)]*\)/g, "").trim().split(/\s+/).length <= 3

/**
 * Markdown-lite rules page (same text Aman edits): "*CAPS*" alone = title band, "1. TITLE:" = numbered
 * section card, "- " bullet, a bullet ending ":" = sub-heading, 4+ short bullets in a row = chip grid,
 * "LABEL: text" = callout. variant "cardio" turns each bullet into a stat card.
 */
function RulesText({ md, variant, big }: { md: string; variant?: "cardio"; big?: boolean }) {
  // A "*CAPS*" line straight after an unfinished bullet is the rest of that bullet
  // (old text had "*DIGITAL FOOD*\n*WEIGHING SCALE.*" split over two lines).
  const lines: RuleLine[] = []
  md.split("\n").forEach((l, i) => {
    const t = l.trim()
    if (!t) return
    const prev = lines[lines.length - 1]
    if (prev && prev.t.startsWith("- ") && !/[.:!?)]$/.test(prev.t) && /^\*[^*]+\*$/.test(t)) prev.t += " " + t
    else lines.push({ t, i })
  })

  const out: ReactNode[] = []
  let k = 0
  while (k < lines.length) {
    const { t, i } = lines[k]
    if (isTitleLine(t)) {
      out.push(<RulesBand key={i} text={t.slice(1, -1).trim()} />)
      k++
      continue
    }
    const sec = t.match(/^(\d+)\.\s*(.+:)$/)
    if (sec) k++
    // Body runs until the next section or title
    const body: RuleLine[] = []
    while (k < lines.length && !isSectionLine(lines[k].t) && !isTitleLine(lines[k].t)) body.push(lines[k++])
    out.push(
      sec ? (
        <View key={i} style={s.ruleCard}>
          <View style={s.ruleCardHead} minPresenceAhead={40}>
            <Text style={s.ruleNum}>{sec[1]}</Text>
            <Rich text={sec[2].replace(/:$/, "")} style={s.ruleCardTitle} />
          </View>
          <View style={{ paddingHorizontal: 12, paddingBottom: 9 }}>{ruleBody(body, variant, big)}</View>
        </View>
      ) : (
        <View key={i}>{ruleBody(body, variant, big)}</View>
      ),
    )
  }
  return <View>{out}</View>
}

function ruleBody(lines: RuleLine[], variant?: "cardio", big?: boolean): ReactNode[] {
  const bulletStyle = big ? [s.ruleBullet, { fontSize: 11.5, lineHeight: 1.5, marginTop: 6 }] : s.ruleBullet
  const out: ReactNode[] = []
  let k = 0
  while (k < lines.length) {
    const { t, i } = lines[k]
    const isBullet = t.startsWith("- ")
    const text = isBullet ? t.slice(2) : t

    // Run of short names (vegetable list etc.) → 3-column chips
    if (variant !== "cardio" && isChip(t)) {
      let j = k
      while (j < lines.length && isChip(lines[j].t)) j++
      if (j - k >= 4) {
        out.push(
          <View key={i} style={s.chipGrid}>
            {lines.slice(k, j).map((c) => (
              <View key={c.i} style={s.chip} wrap={false}>
                <View style={s.dot} />
                <Rich text={c.t.slice(2)} style={{ flex: 1 }} />
              </View>
            ))}
          </View>,
        )
        k = j
        continue
      }
    }
    k++

    if (isBullet && text.endsWith(":")) {
      out.push(<Rich key={i} text={text} style={s.ruleSub} />)
    } else if (isBullet && variant === "cardio") {
      const st = cardioStat(text)
      out.push(
        <View key={i} style={s.statCard} wrap={false}>
          <View style={s.statLeft}>
            {st ? (
              <>
                <Text style={s.statValue}>{st.value}</Text>
                <Text style={s.statUnit}>{st.unit}</Text>
              </>
            ) : (
              <Text style={[s.statUnit, { color: C.orange, fontSize: 9, marginTop: 0 }]}>
                {/bicycl|bike|elliptical|jog|walk|swim/i.test(text) ? "HOW" : "NOTE"}
              </Text>
            )}
          </View>
          <Rich text={text} style={s.statText} />
        </View>,
      )
    } else if (isBullet) {
      out.push(
        <View key={i} style={bulletStyle} wrap={false}>
          <View style={s.dot} />
          <Rich text={text} style={{ flex: 1 }} />
        </View>,
      )
    } else {
      const num = text.match(/^(\d+)\.\s*(.*)$/)
      const label = text.match(/^([A-Z][A-Z &/-]{3,}):\s*(.*)$/)
      if (num)
        out.push(
          <View key={i} style={bulletStyle} wrap={false}>
            <Text style={{ width: big ? 20 : 14, color: C.orange, fontWeight: 700 }}>{num[1]}.</Text>
            <Rich text={num[2]} style={{ flex: 1 }} />
          </View>,
        )
      else if (label)
        out.push(
          <View key={i} style={s.ruleCallout} wrap={false}>
            <Text style={{ color: C.orange, fontWeight: 700, letterSpacing: 0.8, fontSize: 9 }}>{label[1]}</Text>
            <Rich text={label[2]} style={{ marginTop: 2 }} />
          </View>,
        )
      else out.push(<Rich key={i} text={text} style={{ marginTop: 5 }} />)
    }
  }
  return out
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      {/* Plain text on purpose: react-pdf gives a Link in a fixed footer a broken, page-tall tap box that sat
          over the video links, so iPhones opened nothing for most of them. */}
      <Text>www.AmanKhuranaFitness.com</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function Cover({ doc, logo }: { doc: PlanDoc; logo: string }) {
  const h = doc.data.header
  const w = doc.data.workout
  const period =
    doc.period_start && doc.period_end
      ? `${format(new Date(doc.period_start + "T00:00:00"), "d MMM")} – ${format(
          new Date(doc.period_end + "T00:00:00"),
          "d MMM yyyy",
        )}`
      : ""
  // Aman 26 Oct: no "Coaching Week" on the PDF (older plans still have the row saved)
  const filled = h.rows.filter((r) => r.value.trim() && !/coaching\s*week/i.test(r.label))
  return (
    <View>
      <View style={s.band}>
        <Image src={logo} style={s.logo} />
        <View style={{ flex: 1 }}>
          <Text style={s.bandTitle}>{doc.title || (doc.kind === "workout" ? "Workout Plan" : "Diet Plan")}</Text>
          {w?.tag ? <Text style={s.bandTag}>{(w.heading || "WORKOUT").toUpperCase()} · {w.tag.toUpperCase()}</Text> : null}
          {period ? <Text style={s.bandPeriod}>Period: {period}</Text> : null}
        </View>
      </View>
      {h.show && filled.length > 0 && (
        <View style={s.card} wrap={false}>
          <View style={s.infoGrid}>
            {filled.map((r, i) => (
              <View key={i} style={s.infoCell}>
                <Text style={s.infoLabel}>{r.label}</Text>
                <Text style={s.infoValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {h.show && h.dates.length > 0 && (
        <View style={s.card} wrap={false}>
          <View style={{ flexDirection: "row" }}>
            <Text style={[s.th, { width: "34%" }]}>MEASUREMENTS</Text>
            {h.dates.map((d, i) => (
              <Text key={i} style={[s.th, { flex: 1, textAlign: "center" }]}>
                {d}
              </Text>
            ))}
          </View>
          {h.measures.map((m, i) => (
            <View key={i} style={s.tr}>
              <Text style={[s.td, { width: "34%", color: C.mute }]}>{m.label}</Text>
              {h.dates.map((_, j) => (
                <Text
                  key={j}
                  style={[
                    s.td,
                    {
                      flex: 1,
                      textAlign: "center",
                      fontWeight: 700,
                      color: j === h.dates.length - 1 ? C.orange : C.ink,
                    },
                  ]}
                >
                  {m.values[j] ?? ""}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function makeChanged(d: PlanDocData) {
  return (key: string, text: string) => !!(d.markChanges && d.base && d.base[key] !== text)
}

/** Exercise Row supporting bracket for supersets, why line, and sets pills. */
function ExerciseRow({
  r,
  n,
  changed,
  showWhy,
  isGrouped,
  clientAge,
}: {
  r: WorkoutRow
  n: number | string
  changed: (k: string, t: string) => boolean
  showWhy?: boolean
  isGrouped?: boolean
  clientAge?: number
}) {
  if (r.type === "banner")
    return (
      <View style={s.tr} wrap={false}>
        <Rich text={r.name} forceRed style={[s.banner, { flex: 1 }]} />
      </View>
    )

  const warm = r.type === "warmup"
  const isCardio = r.kind === "cardio"

  // Sets text with target heart rate if cardio
  let setsDisplay = r.sets
  if (isCardio && r.cardioMinutes) {
    const mach = r.cardioMachine ? ` · ${r.cardioMachine}` : ""
    const bpm = cardioBpm(clientAge, r.cardioRestHr, r.cardioZone)
    setsDisplay = `${r.cardioMinutes} min${mach}\n${bpm}`
  }

  return (
    <View
      style={[
        s.tr,
        warm ? { backgroundColor: C.tint } : {},
        isGrouped ? { borderLeftWidth: 3, borderLeftColor: C.orange } : {},
      ]}
      wrap={false}
    >
      <View style={[s.td, { width: "66%" }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {warm ? (
            <View style={[s.dot, { marginTop: 5, marginRight: 8 }]} />
          ) : typeof n === "string" ? (
            <Text style={s.numGroup}>{n}</Text>
          ) : (
            <Text style={s.num}>{n}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Rich
              text={r.name}
              forceRed={changed(r.id + ":name", r.name)}
              style={[s.exName, warm ? { fontWeight: 600, fontSize: 9.5 } : {}]}
            />
            {/* Scientific Why note */}
            {showWhy !== false && r.why ? (
              <Text style={{ fontStyle: "italic", fontSize: 7.5, color: C.soft, marginTop: 2 }}>
                Why: {r.why}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Video reference pills */}
        {r.links.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginLeft: warm ? 11 : isGrouped ? 29 : 25 }}>
            {r.links.map((l, i) => (
              <Link key={i} src={l.url} style={s.pill}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Svg width={6} height={6} viewBox="0 0 10 10" style={{ marginRight: 3 }}>
                    <Polygon points="1,0 10,5 1,10" fill={C.link} />
                  </Svg>
                  <Text>{l.label || "Video"}</Text>
                </View>
              </Link>
            ))}
          </View>
        )}

        {/* Form cues / tips */}
        {r.cues.length > 0 && (
          <View style={{ marginLeft: warm ? 11 : isGrouped ? 29 : 25, marginTop: 3 }}>
            <Bullets lines={r.cues.map((c, i) => ({ text: c.text, key: r.id + ":cue" + i }))} changed={changed} />
          </View>
        )}
      </View>

      {/* Sets Column */}
      <View
        style={[
          s.td,
          { width: "34%", borderLeftWidth: 0.6, borderLeftColor: C.rule, justifyContent: "center" },
        ]}
      >
        <Rich text={setsDisplay} forceRed={changed(r.id + ":sets", r.sets)} style={s.sets} />

        {/* Rest / Tempo / RIR pills */}
        {(r.restSec || r.tempo || (r.rir !== undefined && r.rir !== "") || r.technique) && !isCardio ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 3 }}>
            {r.restSec ? (
              <Text style={s.setMetaPill}>
                Rest {r.restSec >= 120 ? `${Math.round(r.restSec / 60)}m` : `${r.restSec}s`}
              </Text>
            ) : null}
            {r.tempo ? <Text style={s.setMetaPill}>{r.tempo}</Text> : null}
            {r.rir !== undefined && r.rir !== "" ? <Text style={s.setMetaPill}>RIR {r.rir}</Text> : null}
            {r.technique ? (
              <Text style={[s.setMetaPill, { color: C.orange, borderColor: C.orange }]}>{r.technique}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}

/** Day table supporting superset groupings and brackets. */
function Day({
  day,
  idx,
  changed,
  showWhy,
  clientAge,
}: {
  day: WorkoutDay
  idx: number
  changed: (k: string, t: string) => boolean
  showWhy?: boolean
  clientAge?: number
}) {
  const m = day.title.match(/^(DAY\s*\d+)\s*[:\-–]\s*(.*)$/i)
  const no = m ? m[1].toUpperCase() : `DAY ${idx + 1}`
  const name = m ? m[2] : day.title
  if (day.rest)
    return (
      <View
        style={[s.card, { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: C.tint }]}
        wrap={false}
      >
        <Text style={s.dayNo}>{no}</Text>
        <Text style={[s.dayTitle, { fontSize: 14 }]}>{name}</Text>
      </View>
    )

  // Pre-calculate groups in day
  const groupLetters = new Map<string, string>()
  const groupCounts = new Map<string, number>()
  let currentLetterCode = 65 // 'A'

  day.rows.forEach((r) => {
    if (r.group) {
      if (!groupLetters.has(r.group)) {
        groupLetters.set(r.group, String.fromCharCode(currentLetterCode++))
      }
      groupCounts.set(r.group, (groupCounts.get(r.group) ?? 0) + 1)
    }
  })

  // Track numbering: non-grouped exercises get 1, 2, 3... Grouped get A1, A2...
  let generalExerciseIndex = 0
  const groupItemIndex = new Map<string, number>()

  const head = (
        <View style={{ flexDirection: "row" }}>
          <View style={[s.th, { width: "66%" }]}>
            <Text>EXERCISES</Text>
            {day.leftNote ? <Rich text={day.leftNote} style={[s.note, { color: "#FFB4A8" }]} /> : null}
          </View>
          <View style={[s.th, { width: "34%" }]}>
            <Text style={{ textAlign: "center" }}>SETS & REPS</Text>
            {day.rightNote ? (
              <Rich text={day.rightNote} style={[s.note, { color: "#FFB4A8", textAlign: "center" }]} />
            ) : null}
          </View>
        </View>
  )

  const rowEls = day.rows.map((r, ri) => {
          let label: number | string = 0
          let isGrouped = false

          if (r.type === "exercise") {
            if (r.group && groupLetters.has(r.group)) {
              isGrouped = true
              const letter = groupLetters.get(r.group)!
              const idxInGroup = (groupItemIndex.get(r.group) ?? 0) + 1
              groupItemIndex.set(r.group, idxInGroup)
              label = `${letter}${idxInGroup}`
            } else {
              label = ++generalExerciseIndex
            }
          }

          // Check if this is the last exercise in its group to print the group note
          const isLastInGroup =
            isGrouped &&
            r.group &&
            groupItemIndex.get(r.group) === groupCounts.get(r.group)

          const groupInfo = r.group && day.groups ? day.groups[r.group] : undefined
          const totalInGroup = r.group ? groupCounts.get(r.group) ?? 2 : 2
          const groupTypeName =
            totalInGroup === 2 ? "SUPERSET" : totalInGroup === 3 ? "TRI-SET" : "GIANT SET"
          const letter = r.group ? groupLetters.get(r.group) : ""

          return (
            <View key={r.id}>
              <ExerciseRow
                r={r}
                n={label}
                changed={changed}
                showWhy={showWhy}
                isGrouped={isGrouped}
                clientAge={clientAge}
              />

              {/* Tinted Group Note row directly following the group */}
              {isLastInGroup && (
                <View
                  style={[
                    s.tr,
                    {
                      backgroundColor: C.tint,
                      borderLeftWidth: 3,
                      borderLeftColor: C.orange,
                      paddingVertical: 5,
                      paddingHorizontal: 8,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    },
                  ]}
                  wrap={false}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 700, fontSize: 8, color: C.orange, letterSpacing: 0.8 }}>
                      {groupTypeName} {letter} · REST {groupInfo?.restAfterSec ?? 90}s AFTER THE ROUND
                    </Text>
                    <Text style={{ fontSize: 8, color: C.soft, fontStyle: "italic", marginTop: 2 }}>
                      {groupInfo?.note || "Perform consecutively with minimal or zero rest between movements."}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )
        })

  // Day title + table header + first exercise never split (Aman 26 Oct: a day must not start at the
  // bottom of a page with its exercises on the next one). The rest of the rows may flow onto new pages.
  const rest = rowEls.slice(1)
  return (
    <View style={{ marginBottom: 12 }}>
      <View wrap={false}>
        <View style={s.dayHead}>
          <Text style={s.dayNo}>{no}</Text>
          <Text style={s.dayTitle}>{name}</Text>
        </View>
        <View style={[s.card, rest.length ? { marginBottom: 0, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}]}>
          {head}
          {rowEls[0]}
        </View>
      </View>
      {rest.length > 0 && (
        <View style={[s.card, { borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>{rest}</View>
      )}
    </View>
  )
}

function MealRow({ r, changed }: { r: DietRow; changed: (k: string, t: string) => boolean }) {
  if (r.type === "banner")
    return (
      <View style={s.tr} wrap={false}>
        <Rich text={r.label} forceRed={false} style={[s.banner, { flex: 1 }]} />
      </View>
    )
  return (
    <View style={s.tr} wrap={false}>
      <View style={[s.td, { width: "21%" }]}>
        <Rich text={r.label} forceRed={changed(r.id + ":label", r.label)} style={{ fontWeight: 700, fontSize: 10 }} />
        {r.sub ? <Text style={{ color: C.mute, fontStyle: "italic", fontSize: 8.5 }}>{r.sub}</Text> : null}
        {r.option ? <Text style={{ color: C.red, fontWeight: 700, fontSize: 8.5, marginTop: 2 }}>{r.option}</Text> : null}
      </View>
      <View style={[s.td, { width: "55%", borderLeftWidth: 0.6, borderLeftColor: C.rule }]}>
        <Bullets lines={r.items.map((c, i) => ({ text: c.text, key: r.id + ":item" + i }))} changed={changed} />
      </View>
      <View style={[s.td, { width: "24%", borderLeftWidth: 0.6, borderLeftColor: C.rule }]}>
        {r.supplements.map((c, i) => (
          <Rich
            key={i}
            text={c.text}
            forceRed={changed(r.id + ":sup" + i, c.text)}
            style={{ textAlign: "center", fontSize: 8.5, marginTop: i ? 4 : 0 }}
          />
        ))}
      </View>
    </View>
  )
}

function Diet({ plan, changed }: { plan: DietPlan; changed: (k: string, t: string) => boolean }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View wrap={false} minPresenceAhead={140}>
        <Text style={[s.h2, { fontSize: 19 }]}>{plan.title}</Text>
      </View>
      <View style={s.card}>
        <View style={{ flexDirection: "row" }}>
          <Text style={[s.th, { width: "21%" }]}>MEALS</Text>
          <Text style={[s.th, { width: "55%" }]}>DIET</Text>
          <Text style={[s.th, { width: "24%", textAlign: "center" }]}>SUPPLEMENTS</Text>
        </View>
        {plan.rows.map((r) => (
          <MealRow key={r.id} r={r} changed={changed} />
        ))}
      </View>
    </View>
  )
}

function Closing({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <View style={{ marginTop: 14 }} wrap={false}>
      {text.split("\n").map((l, i, a) => (
        <Text
          key={i}
          style={
            i === a.length - 1
              ? { fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 600, fontSize: 16, color: C.orange }
              : { color: C.soft }
          }
        >
          {l}
        </Text>
      ))}
    </View>
  )
}

/** Technique Reference box printed once before Day 1 if special techniques are used. */
function TechniqueGuide({ doc }: { doc: PlanDoc }) {
  const d = doc.data
  if (!d.workout) return null

  // Check which techniques are actually used across all days
  const usedTechniques: { title: string; note: string }[] = []
  let hasSupersets = false
  let hasTriSets = false
  let hasGiantSets = false
  let hasDropSet = false
  let hasDoubleDrop = false
  let hasRir = false
  let hasTempo = false
  let hasPartials = false

  d.workout.days.forEach((day) => {
    const groupCounts = new Map<string, number>()
    day.rows.forEach((r) => {
      if (r.group) groupCounts.set(r.group, (groupCounts.get(r.group) ?? 0) + 1)
      if (r.technique?.toLowerCase().includes("double")) hasDoubleDrop = true
      else if (r.technique?.toLowerCase().includes("drop")) hasDropSet = true
      else if (r.technique?.toLowerCase().includes("partial")) hasPartials = true
      if (r.rir !== undefined && r.rir !== "") hasRir = true
      if (r.tempo) hasTempo = true
    })
    groupCounts.forEach((c) => {
      if (c === 2) hasSupersets = true
      else if (c === 3) hasTriSets = true
      else if (c >= 4) hasGiantSets = true
    })
  })

  const techDefs = (exerciseDb.techniques ?? {}) as Record<string, string>

  if (hasSupersets && techDefs.superset) {
    usedTechniques.push({ title: "SUPERSET", note: techDefs.superset })
  }
  if (hasTriSets && techDefs.tri_set) {
    usedTechniques.push({ title: "TRI-SET", note: techDefs.tri_set })
  }
  if (hasGiantSets && techDefs.giant_set) {
    usedTechniques.push({ title: "GIANT SET", note: techDefs.giant_set })
  }
  if (hasDropSet && techDefs.drop_set) {
    usedTechniques.push({ title: "DROP SET", note: techDefs.drop_set })
  }
  if (hasDoubleDrop && techDefs.double_drop) {
    usedTechniques.push({ title: "DOUBLE DROP SET", note: techDefs.double_drop })
  }
  if (hasRir && techDefs.rir) {
    usedTechniques.push({ title: "RIR (REPS IN RESERVE)", note: techDefs.rir })
  }
  if (hasTempo && techDefs.tempo) {
    usedTechniques.push({ title: "TEMPO (REP SPEED)", note: techDefs.tempo })
  }
  if (hasPartials && techDefs.partials) {
    usedTechniques.push({ title: "PARTIAL REPS", note: techDefs.partials })
  }

  if (!usedTechniques.length) return null

  return (
    <View style={[s.card, { backgroundColor: C.tint, borderColor: C.orange, padding: 10, marginBottom: 14 }]} wrap={false}>
      <Text style={{ fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 600, fontSize: 13, color: C.orange, marginBottom: 4 }}>
        How to Use This Plan & Technique Notes
      </Text>
      {usedTechniques.map((item, idx) => (
        <View key={idx} style={{ marginTop: idx ? 3 : 0, flexDirection: "row" }}>
          <Text style={{ fontWeight: 700, fontSize: 8, color: C.orange, width: "24%" }}>{item.title}:</Text>
          <Text style={{ fontSize: 8, color: C.soft, flex: 1 }}>{item.note}</Text>
        </View>
      ))}
    </View>
  )
}

/** assetBase = site origin in the browser, or the public/ folder path when rendering in Node. */
export function PlanPdf({ doc, assetBase }: { doc: PlanDoc; assetBase: string }) {
  registerFonts(assetBase)
  const logo = assetBase + "/images/aman/logo.jpg"
  const d = doc.data
  const changed = makeChanged(d)

  // Compute age from DOB row in header if present
  const dobRow = d.header.rows.find((r) => r.label.toLowerCase().includes("birth") || r.label.toLowerCase().includes("dob"))
  const clientAge = calcAge(dobRow?.value)

  return (
    <Document title={doc.title} author="Aman Khurana Fitness">
      <Page size="A4" style={s.page}>
        <Cover doc={doc} logo={logo} />
        {d.showRules && d.workout?.rules ? (
          // Aman 26 Oct: highlight these points and make the text bigger
          <View style={{ backgroundColor: C.tint, borderLeftWidth: 3, borderLeftColor: C.orange, borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <Text style={[s.h2, { fontSize: 20 }]}>Important Points</Text>
            <RulesText md={d.workout.rules} big />
          </View>
        ) : null}
        {d.showRules && d.diet?.rules ? (
          <View>
            <RulesText md={d.diet.rules} />
          </View>
        ) : null}
        <Footer />
      </Page>
      <Page size="A4" style={s.page}>
        {/* Technique Guide Box before Day 1 */}
        {d.workout && <TechniqueGuide doc={doc} />}

        {d.workout?.days.map((day, i) => (
          <Day
            key={day.id}
            day={day}
            idx={i}
            changed={changed}
            showWhy={d.showWhy !== false}
            clientAge={clientAge}
          />
        ))}
        {d.diet?.plans.map((p) => (
          <Diet key={p.id} plan={p} changed={changed} />
        ))}
        {d.diet?.cardio ? (
          <View break>
            <RulesText md={d.diet.cardio} variant="cardio" />
          </View>
        ) : null}
        {d.workout?.note ? (
          <Text style={{ color: C.red, fontWeight: 700, textAlign: "center", marginTop: 12 }}>
            {d.workout.note}
          </Text>
        ) : null}
        <Closing text={d.workout?.closing ?? d.diet?.closing ?? ""} />
        <Footer />
      </Page>
    </Document>
  )
}

/** Builds the PDF on the phone itself. Slow there (~8s on a mid phone); used only as a fallback. */
export async function renderPlanPdfLocally(doc: PlanDoc): Promise<Blob> {
  return pdf(<PlanPdf doc={doc} assetBase={window.location.origin} />).toBlob()
}
