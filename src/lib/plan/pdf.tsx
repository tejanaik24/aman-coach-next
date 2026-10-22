"use client"

// Aman's plan PDF. Same structure as his Google Docs plans (header table, rules pages,
// day tables / meal tables, red banners, linked products and videos), cleaner look.
import { Document, Page, View, Text, Link, Image, Font, StyleSheet, Svg, Polygon, pdf } from "@react-pdf/renderer"
import type { Style } from "@react-pdf/types"
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
  exName: { fontWeight: 700, fontSize: 10.5, flex: 1 },
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

/** Markdown-lite rules page: "- " bullet, "1. " numbered, CAPS line = heading. */
function RulesText({ md }: { md: string }) {
  return (
    <View>
      {md
        .split("\n")
        .filter((l) => l.trim())
        .map((l, i) => {
          const t = l.trim()
          if (t.startsWith("- "))
            return (
              <View key={i} style={[s.bullet, { marginLeft: 12 }]}>
                <View style={s.dot} />
                <Rich text={t.slice(2)} style={{ flex: 1 }} />
              </View>
            )
          const num = t.match(/^(\d+)\.\s*(.*)$/)
          if (num)
            return (
              <View key={i} style={{ flexDirection: "row", marginTop: 6 }}>
                <Text style={{ width: 16, color: C.orange, fontWeight: 700 }}>{num[1]}.</Text>
                <Rich text={num[2]} style={{ flex: 1 }} />
              </View>
            )
          const isHead = t.replace(/[^A-Za-z]/g, "").length > 4 && t === t.toUpperCase()
          return (
            <Rich
              key={i}
              text={t}
              style={isHead ? { fontWeight: 700, marginTop: 8, fontSize: 10.5 } : { marginTop: 4 }}
            />
          )
        })}
    </View>
  )
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Link src="https://www.amankhuranafitness.com" style={{ color: C.mute, textDecoration: "none" }}>
        www.AmanKhuranaFitness.com
      </Link>
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
  const filled = h.rows.filter((r) => r.value.trim())
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

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={s.dayHead} wrap={false} minPresenceAhead={120}>
        <Text style={s.dayNo}>{no}</Text>
        <Text style={s.dayTitle}>{name}</Text>
      </View>
      <View style={s.card}>
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

        {day.rows.map((r, ri) => {
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
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 }}>
                    <Text
                      style={{
                        fontWeight: 700,
                        fontSize: 8,
                        color: C.orange,
                        letterSpacing: 0.8,
                        marginRight: 6,
                      }}
                    >
                      {groupTypeName} {letter}
                    </Text>
                    <Text style={{ fontSize: 8, color: C.soft, fontStyle: "italic" }}>
                      {groupInfo?.note ||
                        "Perform consecutively with minimal or zero rest between movements."}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: C.orange }}>
                    Rest {groupInfo?.restAfterSec ?? 90}s after round
                  </Text>
                </View>
              )}
            </View>
          )
        })}
      </View>
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
          <View>
            <Text style={s.h2}>Important Points</Text>
            <RulesText md={d.workout.rules} />
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
            <RulesText md={d.diet.cardio} />
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

export async function renderPlanPdf(doc: PlanDoc): Promise<Blob> {
  return pdf(<PlanPdf doc={doc} assetBase={window.location.origin} />).toBlob()
}
