"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { format } from "date-fns"
import {
  ArrowLeft,
  Check,
  Eye,
  MoreHorizontal,
  Plus,
  Send,
  Undo2,
  FileText,
  Play,
  Moon,
  ChevronDown,
  ChevronUp,
  Utensils,
  Search,
  Layers,
  Copy,
  Trash2,
  Zap,
  Activity,
  Heart,
  Dumbbell,
  Sparkles,
  X,
} from "lucide-react"
import {
  calcAge,
  plain,
  uid,
  type DietPlan,
  type DietRow,
  type LibraryItem,
  type PlanDoc,
  type PlanDocData,
  type WorkoutDay,
  type WorkoutRow,
} from "@/lib/plan/types"
import { saveDoc } from "@/lib/plan/store"
import { inputCls, Label } from "./parts"
import {
  ActionSheet,
  AddRowsPicker,
  BannerSheet,
  GroupSheet,
  HeaderSheet,
  MealSheet,
  RowSheet,
  SupersetPickerSheet,
  type Action,
} from "./sheets"
import SendSheet from "./SendSheet"
import CopyDaySheet from "./CopyDaySheet"
import QuickFoodPickerSheet from "./QuickFoodPickerSheet"
import QuantityChips from "./QuantityChips"
import exerciseDb from "@/lib/plan/exercise-db.json"

type Open =
  | { k: "row"; day: string; row: string }
  | { k: "banner"; day: string; row: string }
  | { k: "meal"; plan: string; row: string }
  | { k: "dbanner"; plan: string; row: string }
  | { k: "add"; day: string; kind: "exercise" | "warmup"; initialMuscle?: string }
  | { k: "superset"; day: string }
  | { k: "group"; day: string; groupId: string }
  | { k: "quickday"; day: string }
  | { k: "add_menu"; day: string }
  | { k: "diet_add_menu"; plan: string }
  | { k: "food_picker"; plan: string; mealId: string }
  | { k: "actions"; title: string; actions: Action[] }
  | { k: "header" }
  | { k: "send" }
  | { k: "copyday" }
  | null

const move = <T,>(a: T[], i: number, d: number) => {
  const j = i + d
  if (j < 0 || j >= a.length) return
  ;[a[i], a[j]] = [a[j], a[i]]
}

export default function PlanEditor({
  initial,
  library,
  client,
  onLibraryChange,
}: {
  initial: PlanDoc
  library: LibraryItem[]
  client: { name: string; phone: string | null } | null
  onLibraryChange: () => void
}) {
  const router = useRouter()
  const [doc, setDoc] = useState(initial)
  const [past, setPast] = useState<PlanDoc[]>([])
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved")
  const [open, setOpen] = useState<Open>(null)
  const [tab, setTab] = useState(0) // diet plan tab
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({})
  const [collapsedMeals, setCollapsedMeals] = useState<Record<string, boolean>>({})
  const [activeMealId, setActiveMealId] = useState<string | null>(null)
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null)
  const [hideHint, setHideHint] = useState(false)
  const first = useRef(true)

  // ---- edits with undo
  const docRef = useRef(doc)
  useEffect(() => {
    docRef.current = doc
  }, [doc])
  // Build-time meter: counts 10s steps while the screen is open and he edited in the last 2 minutes
  const buildSec = useRef(initial.data.buildSeconds ?? 0)
  const lastEdit = useRef(Date.now())
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastEdit.current < 120_000) buildSec.current += 10
    }, 10_000)
    return () => clearInterval(t)
  }, [])

  const edit = useCallback((fn: (d: PlanDoc) => void) => {
    lastEdit.current = Date.now()
    const cur = docRef.current
    const next = structuredClone(cur)
    fn(next)
    docRef.current = next
    setPast((p) => [...p.slice(-49), cur])
    setDoc(next)
  }, [])
  const data = (fn: (d: PlanDocData) => void) => edit((d) => fn(d.data))
  const undo = () => {
    if (!past.length) return
    const prev = past[past.length - 1]
    setDoc(prev)
    setPast(past.slice(0, -1))
    toast("Undone", { icon: "↩️" })
  }

  // ---- autosave (debounced)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSaved("saving")
    const t = setTimeout(() => {
      saveDoc(doc.id, {
        title: doc.title,
        period_start: doc.period_start,
        period_end: doc.period_end,
        data: { ...doc.data, buildSeconds: buildSec.current },
      })
        .then(() => setSaved("saved"))
        .catch(() => setSaved("error"))
    }, 700)
    return () => clearTimeout(t)
  }, [doc])

  async function openPreview() {
    const w = window.open("", "_blank")
    try {
      const { renderPlanPdf } = await import("@/lib/plan/pdf-client")
      const url = URL.createObjectURL(await renderPlanPdf(doc))
      if (w) w.location.href = url
      else window.location.href = url
    } catch (e) {
      console.error("PDF generation failed:", e)
      w?.close()
      toast.error("Could not make the preview")
    }
  }

  const d = doc.data

  // Calculate client age from DOB row in header if present
  const clientAge = useMemo(() => {
    const dobRow = d.header.rows.find(
      (r) => r.label.toLowerCase().includes("birth") || r.label.toLowerCase().includes("dob"),
    )
    return calcAge(dobRow?.value)
  }, [d.header.rows])

  const changedIds = useMemo(() => {
    const set = new Set<string>()
    if (!d.markChanges || !d.base) return set
    const base = d.base
    const check = (id: string, key: string, text: string) => {
      if (base[id + key] !== text) set.add(id)
    }
    d.workout?.days.forEach((day) =>
      day.rows.forEach((r) => {
        check(r.id, ":name", r.name)
        check(r.id, ":sets", r.sets)
        if (r.why) check(r.id, ":why", r.why)
        r.cues.forEach((c, i) => check(r.id, ":cue" + i, c.text))
      }),
    )
    d.diet?.plans.forEach((p) =>
      p.rows.forEach((r) => {
        check(r.id, ":label", r.label)
        r.items.forEach((c, i) => check(r.id, ":item" + i, c.text))
        r.supplements.forEach((c, i) => check(r.id, ":sup" + i, c.text))
      }),
    )
    return set
  }, [d])

  // ---- workout helpers
  const findDay = (pd: PlanDocData, id: string) => pd.workout!.days.find((x) => x.id === id)!
  const nextDayNo = () => (d.workout?.days.length ?? 0) + 1
  const addDay = (rest: boolean) =>
    data((pd) => {
      const prev = pd.workout!.days.filter((x) => !x.rest).at(-1)
      pd.workout!.days.push({
        id: uid(),
        rest,
        title: `DAY ${nextDayNo()}: ${rest ? "REST/CARDIO" : "New Day"}`,
        leftNote: prev?.leftNote ?? "",
        rightNote: prev?.rightNote ?? "",
        rows: [],
        groups: {},
      })
      setActiveDayIndex(pd.workout!.days.length - 1)
    })

  const toggleDayCollapse = (dayId: string) => {
    setCollapsedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }))
  }

  const scrollToDay = (idx: number, dayId: string) => {
    setActiveDayIndex(idx)
    setCollapsedDays((prev) => ({ ...prev, [dayId]: false }))
    const el = document.getElementById(`day-section-${dayId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // --- Superset helpers
  const groupWithNext = (dayId: string, rowIndex: number) => {
    data((pd) => {
      const day = findDay(pd, dayId)
      if (rowIndex >= day.rows.length - 1) return
      const r1 = day.rows[rowIndex]
      const r2 = day.rows[rowIndex + 1]
      const gid = r1.group || uid()
      r1.group = gid
      r2.group = gid
      if (!day.groups) day.groups = {}
      if (!day.groups[gid]) {
        day.groups[gid] = {
          note: (exerciseDb.techniques as Record<string, string>).superset ?? "Perform with minimal rest between sets.",
          restAfterSec: 90,
        }
      }
    })
    toast.success("Grouped into superset")
  }

  const removeFromGroup = (dayId: string, rowId: string) => {
    data((pd) => {
      const day = findDay(pd, dayId)
      const target = day.rows.find((x) => x.id === rowId)
      if (!target || !target.group) return
      const gid = target.group
      target.group = undefined
      // If 1 or 0 remain in group, clean up
      const remaining = day.rows.filter((x) => x.group === gid)
      if (remaining.length <= 1) {
        remaining.forEach((r) => (r.group = undefined))
        if (day.groups) delete day.groups[gid]
      }
    })
    toast.success("Removed from superset")
  }

  const ungroupWholeGroup = (dayId: string, gid: string) => {
    data((pd) => {
      const day = findDay(pd, dayId)
      day.rows.forEach((r) => {
        if (r.group === gid) r.group = undefined
      })
      if (day.groups) delete day.groups[gid]
    })
    toast.success("Superset removed")
  }

  const handleGroupExercises = (dayId: string, selectedIds: string[]) => {
    if (selectedIds.length < 2) return
    data((pd) => {
      const day = findDay(pd, dayId)
      const gid = uid()
      const techKey =
        selectedIds.length === 2 ? "superset" : selectedIds.length === 3 ? "tri_set" : "giant_set"
      const note =
        (exerciseDb.techniques as Record<string, string>)[techKey] ??
        "Perform consecutively with zero rest until the round is complete."

      day.rows.forEach((r) => {
        if (selectedIds.includes(r.id)) {
          r.group = gid
        }
      })
      if (!day.groups) day.groups = {}
      day.groups[gid] = { note, restAfterSec: 90 }
    })
    toast.success(
      `Grouped ${selectedIds.length} exercises as ${
        selectedIds.length === 2 ? "SUPERSET" : selectedIds.length === 3 ? "TRI-SET" : "GIANT SET"
      }`,
    )
  }

  // --- Stretches placement: Dynamic -> top, Static -> bottom
  const addStretchesToDay = (dayId: string, items: LibraryItem[]) => {
    data((pd) => {
      const day = findDay(pd, dayId)
      items.forEach((it) => {
        const isStatic =
          it.name.toLowerCase().includes("static") ||
          it.name.toLowerCase().includes("hold") ||
          (it.data.sets ?? "").includes("hold")
        const stretchRow: WorkoutRow = {
          id: uid(),
          type: "warmup",
          name: it.name,
          links: it.data.links ?? [],
          cues: it.data.cues ?? [],
          sets: it.data.sets ?? (isStatic ? "2 sets × 30s hold" : "10-15 reps each"),
          kind: "stretch",
          stretchType: isStatic ? "static" : "dynamic",
          stretchHoldSec: isStatic ? 30 : undefined,
          workingSets: isStatic ? 2 : undefined,
          why: it.data.why,
        }

        if (isStatic) {
          // Static cool-down stretch goes at the bottom
          day.rows.push(stretchRow)
        } else {
          // Dynamic warm-up stretch goes at top (before regular exercises)
          const firstExIdx = day.rows.findIndex((x) => x.type === "exercise")
          if (firstExIdx === -1) {
            day.rows.unshift(stretchRow)
          } else {
            day.rows.splice(firstExIdx, 0, stretchRow)
          }
        }
      })
    })
    setOpen(null)
    toast.success(`${items.length} stretch${items.length > 1 ? "es" : ""} added`)
  }

  // --- Quick Day Split Builder
  const applyQuickDay = (dayId: string, splitKey: string) => {
    const dbList = (exerciseDb.exercises ?? []) as Array<{
      name: string
      muscle: string
      kind: "strength" | "cardio" | "stretch"
      why?: string
      cues?: string[]
      links?: { label: string; url: string }[]
      defaultScheme?: { warmupSets?: number; sets?: number; reps?: string; restSec?: number }
    }>

    const findDb = (namePart: string) =>
      dbList.find((e) => e.name.toLowerCase().includes(namePart.toLowerCase()))

    let warmStretches = ["Dynamic Stretchings"]
    let cardioName = "Cardio Warm Up: Cycling/ Elliptical trainer"
    let exerciseNames: string[] = []
    let coolStretches = ["Chest Doorway Stretch (Static)"]
    let dayTitleSuffix = "Upper Body"

    if (splitKey === "upper") {
      dayTitleSuffix = "Upper Body"
      warmStretches = ["Dynamic Stretchings", "Arm Circles & Hugs (Dynamic)"]
      cardioName = "Cardio Warm Up: Cycling/ Elliptical trainer"
      exerciseNames = [
        "Front lat / Upper Back Pulldown",
        "Low Inclined Dumbbell Chest Press",
        "One Arm Dumbbell Rows (Lats s/s Upper Back focused)",
        "Seated Side Lateral Dumbbell Raises",
        "High To Low Dual Rope Tricep Extension",
        "Standing Neutral to Supination Rope Curls",
      ]
      coolStretches = [
        "Chest Doorway Stretch (Static)",
        "Kneeling Lat & Upper Back Stretch (Childs Pose with reach)",
      ]
    } else if (splitKey === "lower") {
      dayTitleSuffix = "Lower Body"
      warmStretches = ["Dynamic Stretchings (Lower Body)", "Cat & Camel"]
      cardioName = "Cardio Warm Up: Recumbent Bike Or Incline TREADMILL walk"
      exerciseNames = [
        "Heels Elevated Dumbbell Goblet Squat",
        "Lying Leg Curls",
        "Machine Hip Thrust",
        "Leg Extension (Full ROM)",
        "Dumbbell Romanian Deadlifts",
        "Standing Calf Raise (Smith Machine)",
      ]
      coolStretches = ["Standing Quad Stretch (Static)", "Kneeling Hip Flexor Stretch (Couch Stretch)"]
    } else if (splitKey === "push") {
      dayTitleSuffix = "Push (Chest/Shoulders/Triceps)"
      warmStretches = ["Dynamic Stretchings", "Arm Circles & Hugs (Dynamic)"]
      cardioName = "Cardio Warm Up: Cycling/ Elliptical trainer"
      exerciseNames = [
        "Low Inclined Dumbbell Chest Press",
        "Flat Dumbbell Press",
        "Seated Dumbbell Shoulder Press",
        "Seated Side Lateral Dumbbell Raises",
        "High To Low Dual Rope Tricep Extension",
        "Single arm overhead DUMBBELL Tricep Extension",
      ]
      coolStretches = ["Chest Doorway Stretch (Static)", "Overhead Tricep & Lat Stretch"]
    } else if (splitKey === "pull") {
      dayTitleSuffix = "Pull (Back/Biceps/Rear Delts)"
      warmStretches = ["Dynamic Stretchings", "Cat & Camel"]
      cardioName = "Cardio Warm Up: Cycling/ Elliptical trainer"
      exerciseNames = [
        "Bodyweight Pull Ups (Pronated)",
        "Front lat / Upper Back Pulldown",
        "One Arm Dumbbell Rows (Lats s/s Upper Back focused)",
        "Cross Cable 45 degree Rear Delt Fly",
        "Standing Neutral to Supination Rope Curls",
        "Single Arm Preacher Curls (On 45-75 Degree Incline bench)",
      ]
      coolStretches = [
        "Kneeling Lat & Upper Back Stretch (Childs Pose with reach)",
        "Biceps & Anterior Shoulder Wall Stretch",
      ]
    } else if (splitKey === "legs") {
      dayTitleSuffix = "Legs (Quads/Hamstrings/Glutes/Calves)"
      warmStretches = ["Dynamic Stretchings (Lower Body)", "Deep Squat to Hamstring Stretch (Bootstrappers)"]
      cardioName = "Cardio Warm Up: Recumbent Bike Or Incline TREADMILL walk"
      exerciseNames = [
        "Barbell Back Squat",
        "Dumbbell Romanian Deadlifts",
        "Leg Press (Quad Focused - Low Foot Placement)",
        "Seated Leg Curl",
        "Machine Hip Thrust",
        "Standing Calf Raise (Smith Machine)",
      ]
      coolStretches = ["Standing Quad Stretch (Static)", "Pigeon Pose / Glute Stretch"]
    } else if (splitKey === "full") {
      dayTitleSuffix = "Full Body"
      warmStretches = ["Dynamic Stretchings"]
      cardioName = "Cardio Warm Up: Cycling/ Elliptical trainer"
      exerciseNames = [
        "Heels Elevated Dumbbell Goblet Squat",
        "Low Inclined Dumbbell Chest Press",
        "Front lat / Upper Back Pulldown",
        "Dumbbell Romanian Deadlifts",
        "Behind the back Cable lateral Raise",
        "Core: Planks (Isometric Hold)",
      ]
      coolStretches = ["Pigeon Pose / Glute Stretch", "Chest Doorway Stretch (Static)"]
    }

    data((pd) => {
      const day = findDay(pd, dayId)
      day.title = day.title.replace(/:.*$/, "") + `: ${dayTitleSuffix}`

      // Create new rows
      const rows: WorkoutRow[] = []

      // 1. Dynamic Stretches
      warmStretches.forEach((wsName) => {
        const item = findDb(wsName)
        rows.push({
          id: uid(),
          type: "warmup",
          name: item?.name ?? wsName,
          links: item?.links ?? [],
          cues: (item?.cues ?? []).map((t) => ({ text: t })),
          sets: "10-15 reps each",
          kind: "stretch",
          stretchType: "dynamic",
          why: item?.why,
        })
      })

      // 2. Cardio Warm-up
      const cardioItem = findDb(cardioName)
      rows.push({
        id: uid(),
        type: "warmup",
        name: cardioItem?.name ?? cardioName,
        links: cardioItem?.links ?? [],
        cues: (cardioItem?.cues ?? []).map((t) => ({ text: t })),
        sets: "10 minutes\n(Average BPM: 110-130)",
        kind: "cardio",
        cardioMachine: "Bike",
        cardioMinutes: 10,
        cardioZone: "Z2",
        why: cardioItem?.why,
      })

      // 3. Main Exercises
      exerciseNames.forEach((exName) => {
        const item = findDb(exName)
        const warmupCount = item?.defaultScheme?.warmupSets ?? 1
        const workingCount = item?.defaultScheme?.sets ?? 3
        const repsText = item?.defaultScheme?.reps ?? "10-15"
        const restSec = item?.defaultScheme?.restSec ?? 60
        const scheme = `${warmupCount ? `${warmupCount} warm up + ` : ""}${workingCount} × ${repsText} Reps`

        rows.push({
          id: uid(),
          type: "exercise",
          name: item?.name ?? exName,
          links: item?.links ?? [],
          cues: (item?.cues ?? []).map((t) => ({ text: t })),
          sets: scheme,
          kind: "strength",
          warmupSets: warmupCount,
          workingSets: workingCount,
          reps: repsText,
          restSec,
          why: item?.why,
        })
      })

      // 4. Static Stretches (Cool-down)
      coolStretches.forEach((csName) => {
        const item = findDb(csName)
        rows.push({
          id: uid(),
          type: "warmup",
          name: item?.name ?? csName,
          links: item?.links ?? [],
          cues: (item?.cues ?? []).map((t) => ({ text: t })),
          sets: "2 sets × 30s hold",
          kind: "stretch",
          stretchType: "static",
          stretchHoldSec: 30,
          workingSets: 2,
          why: item?.why,
        })
      })

      day.rows = rows
    })

    setOpen(null)
    toast.success(`Quick day applied: ${dayTitleSuffix}`)
  }

  const deleteRowWithToast = (dayId: string, rowId: string) => {
    data((pd) => {
      const day = findDay(pd, dayId)
      day.rows = day.rows.filter((x) => x.id !== rowId)
    })
    toast((t) => (
      <span className="flex items-center gap-3">
        Deleted row
        <button
          type="button"
          onClick={() => {
            undo()
            toast.dismiss(t.id)
          }}
          className="underline font-bold text-accent-orange cursor-pointer ml-1"
        >
          Undo
        </button>
      </span>
    ))
  }

  const dayActions = (day: WorkoutDay, i: number): Action[] => [
    {
      label: day.rest ? "Make it a training day" : "Make it a rest day",
      run: () =>
        data((pd) => {
          findDay(pd, day.id).rest = !day.rest
        }),
    },
    {
      label: "Quick day (Auto-populate split)",
      run: () => setOpen({ k: "quickday", day: day.id }),
    },
    {
      label: "Duplicate day",
      run: () =>
        data((pd) => {
          const c = structuredClone(day)
          c.id = uid()
          c.rows.forEach((r) => (r.id = uid()))
          c.title = c.title.replace(/^DAY\s*\d+/i, `DAY ${pd.workout!.days.length + 1}`)
          pd.workout!.days.splice(i + 1, 0, c)
        }),
    },
    { label: "Move up", run: () => data((pd) => move(pd.workout!.days, i, -1)) },
    { label: "Move down", run: () => data((pd) => move(pd.workout!.days, i, 1)) },
    {
      label: "Edit table header notes",
      run: () => setOpen({ k: "banner", day: day.id, row: "__notes" }),
    },
    {
      label: "Delete day",
      danger: true,
      run: () => {
        if (confirm(`Delete ${day.title}?`))
          data((pd) => {
            pd.workout!.days.splice(i, 1)
          })
      },
    },
  ]

  const rowActions = (day: WorkoutDay, r: WorkoutRow, i: number): Action[] => [
    ...(i < day.rows.length - 1
      ? [
          {
            label: "Group with next (Superset)",
            run: () => groupWithNext(day.id, i),
          },
        ]
      : []),
    ...(r.group
      ? [
          {
            label: "Remove from superset",
            run: () => removeFromGroup(day.id, r.id),
          },
        ]
      : []),
    { label: "Move up", run: () => data((pd) => move(findDay(pd, day.id).rows, i, -1)) },
    { label: "Move down", run: () => data((pd) => move(findDay(pd, day.id).rows, i, 1)) },
    {
      label: "Duplicate",
      run: () =>
        data((pd) => {
          findDay(pd, day.id).rows.splice(i + 1, 0, { ...structuredClone(r), id: uid() })
        }),
    },
    {
      label: "Add red line below",
      run: () => {
        const id = uid()
        data((pd) => {
          findDay(pd, day.id).rows.splice(i + 1, 0, {
            id,
            type: "banner",
            name: "*Mechanical Drop SET*",
            links: [],
            cues: [],
            sets: "",
          })
        })
        setOpen({ k: "banner", day: day.id, row: id })
      },
    },
    {
      label: "Delete",
      danger: true,
      run: () => deleteRowWithToast(day.id, r.id),
    },
  ]

  const newRow = (dayId: string, type: "exercise" | "warmup", kind: "strength" | "cardio" | "stretch" = "strength") => {
    const id = uid()
    data((pd) => {
      findDay(pd, dayId).rows.push({
        id,
        type,
        kind,
        name: "",
        links: [],
        cues: [],
        sets: kind === "stretch" ? "2 sets × 30s hold" : kind === "cardio" ? "10 min · Incline walk" : "3 × 10-15 Reps",
      })
    })
    setOpen({ k: "row", day: dayId, row: id })
  }

  // ---- diet helpers
  const plans = d.diet?.plans ?? []
  const plan = plans[Math.min(tab, plans.length - 1)]
  const findPlan = (pd: PlanDocData, id: string) => pd.diet!.plans.find((x) => x.id === id)!

  const toggleMealCollapse = (mealId: string) => {
    setCollapsedMeals((prev) => ({ ...prev, [mealId]: !prev[mealId] }))
  }

  const scrollToMeal = (mealId: string) => {
    setActiveMealId(mealId)
    setCollapsedMeals((prev) => ({ ...prev, [mealId]: false }))
    const el = document.getElementById(`meal-card-${mealId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const addMeal = () => {
    if (!plan) return
    const id = uid()
    const count = plan.rows.filter((x) => x.type === "meal" && /^MEAL\s*\d/i.test(x.label)).length
    data((pd) => {
      findPlan(pd, plan.id).rows.push({
        id,
        type: "meal",
        label: `MEAL ${count + 1}`,
        sub: "",
        option: "",
        items: [],
        supplements: [],
      })
    })
    setActiveMealId(id)
    setCollapsedMeals((prev) => ({ ...prev, [id]: false }))
  }

  const duplicateMealAsOption = (p: DietPlan, r: DietRow, i: number) => {
    data((pd) => {
      const rows = findPlan(pd, p.id).rows
      const opts = rows.filter((x) => x.type === "meal" && x.label === r.label && x.option).length || 1
      const next = opts + 1
      const copy: DietRow = { ...structuredClone(r), id: uid(), option: `Option ${next}` }
      const orText = `*OR (Either Complete ${Array.from({ length: next }, (_, k) => `Option ${k + 1}`).join(" OR ")})*`
      if (!r.option) rows[i] = { ...rows[i], option: "Option 1" }
      let at = i + 1
      while (
        at < rows.length &&
        (rows[at].type === "banner"
          ? /^\*?OR\b/i.test(plain(rows[at].label))
          : rows[at].label === r.label)
      ) {
        at++
      }
      rows.splice(
        at,
        0,
        { id: uid(), type: "banner", label: orText, sub: "", option: "", items: [], supplements: [] },
        copy,
      )
    })
    toast.success("Option added")
  }
  const mealActions = (p: DietPlan, r: DietRow, i: number): Action[] => [
    ...(r.type === "meal"
      ? [
          {
            label: "Add another option of this meal",
            run: () =>
              data((pd) => {
                const rows = findPlan(pd, p.id).rows
                const opts =
                  rows.filter((x) => x.type === "meal" && x.label === r.label && x.option).length || 1
                const next = opts + 1
                const copy: DietRow = { ...structuredClone(r), id: uid(), option: `Option ${next}` }
                const orText = `*OR (Either Complete ${Array.from(
                  { length: next },
                  (_, k) => `Option ${k + 1}`,
                ).join(" OR ")})*`
                if (!r.option) rows[i] = { ...rows[i], option: "Option 1" }
                let at = i + 1
                while (
                  at < rows.length &&
                  (rows[at].type === "banner"
                    ? /^\*?OR\b/i.test(plain(rows[at].label))
                    : rows[at].label === r.label)
                )
                  at++
                rows.splice(
                  at,
                  0,
                  { id: uid(), type: "banner", label: orText, sub: "", option: "", items: [], supplements: [] },
                  copy,
                )
              }),
          },
        ]
      : []),
    { label: "Move up", run: () => data((pd) => move(findPlan(pd, p.id).rows, i, -1)) },
    { label: "Move down", run: () => data((pd) => move(findPlan(pd, p.id).rows, i, 1)) },
    {
      label: "Duplicate",
      run: () =>
        data((pd) => {
          findPlan(pd, p.id).rows.splice(i + 1, 0, { ...structuredClone(r), id: uid() })
        }),
    },
    {
      label: "Add red line below",
      run: () => {
        const id = uid()
        data((pd) => {
          findPlan(pd, p.id).rows.splice(i + 1, 0, {
            id,
            type: "banner",
            label: "",
            sub: "",
            option: "",
            items: [],
            supplements: [],
          })
        })
        setOpen({ k: "dbanner", plan: p.id, row: id })
      },
    },
    {
      label: "Delete",
      danger: true,
      run: () =>
        data((pd) => {
          findPlan(pd, p.id).rows.splice(i, 1)
        }),
    },
  ]
  const planActions = (p: DietPlan, i: number): Action[] => [
    {
      label: "Copy this whole diet (e.g. Veg for Tuesdays)",
      run: () => {
        data((pd) => {
          const c = structuredClone(p)
          c.id = uid()
          c.title = "VEG DIET PLAN (For Tuesdays)"
          c.rows.forEach((r) => (r.id = uid()))
          pd.diet!.plans.splice(i + 1, 0, c)
        })
        setTab(i + 1)
      },
    },
    {
      label: "Delete this diet",
      danger: true,
      run: () => {
        if (confirm(`Delete ${p.title}?`)) {
          data((pd) => {
            pd.diet!.plans.splice(i, 1)
          })
          setTab(0)
        }
      },
    },
  ]

  // ---- sheet targets
  const openRow =
    open?.k === "row"
      ? d.workout?.days.find((x) => x.id === open.day)?.rows.find((r) => r.id === open.row)
      : undefined
  const openBannerDay = open?.k === "banner" ? d.workout?.days.find((x) => x.id === open.day) : undefined
  const openBanner = open?.k === "banner" ? openBannerDay?.rows.find((r) => r.id === open.row) : undefined
  const openMeal =
    open?.k === "meal" || open?.k === "dbanner"
      ? d.diet?.plans.find((x) => x.id === open.plan)?.rows.find((r) => r.id === open.row)
      : undefined

  const activeDay = d.workout?.days[activeDayIndex] ?? d.workout?.days[0]

  const back = () => router.push(doc.client_id ? `/clients/${doc.client_id}` : "/plans/library")

  return (
    <div className="min-h-screen text-white select-none">
      {/* Container with ample bottom padding so the single sticky bottom bar never overlaps */}
      <div className="max-w-2xl mx-auto w-full pb-[calc(100px+env(safe-area-inset-bottom))]">
        {/* TOP BAR: Back + Saved Status + Undo only */}
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-[#111111]/90 backdrop-blur-md border-b border-border-subtle flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={back}
              aria-label="Back"
              className="size-12 min-h-[48px] grid place-items-center rounded-full bg-white/5 active:bg-white/10 cursor-pointer shrink-0"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-widest text-accent-orange font-bold truncate">
                {doc.is_template ? "Template" : client?.name ?? ""} · {doc.kind === "workout" ? "Workout" : "Diet"}
              </p>
              <p className="text-xs text-text-muted flex items-center gap-1.5 whitespace-nowrap">
                {saved === "saved" ? (
                  <>
                    <Check className="size-3.5 text-success" /> Saved
                  </>
                ) : saved === "saving" ? (
                  <span className="text-accent-orange">Saving…</span>
                ) : (
                  <span className="text-danger font-bold">Not saved</span>
                )}
                {doc.sent_at && <span className="text-success">· Sent {format(new Date(doc.sent_at), "d MMM")}</span>}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={undo}
            disabled={!past.length}
            aria-label="Undo"
            className="size-12 min-h-[48px] grid place-items-center rounded-full bg-white/5 disabled:opacity-20 active:bg-white/10 cursor-pointer shrink-0"
          >
            <Undo2 className="size-5" />
          </button>
        </div>

        {/* WORKOUT DAY NAVIGATION STRIP (sticky below top bar) */}
        {d.workout && d.workout.days.length > 0 && (
          <div className="sticky top-[69px] z-30 -mx-4 px-4 py-2 bg-bg-primary/95 backdrop-blur-md border-b border-border-subtle/70 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {d.workout.days.map((day, di) => {
              const active = di === activeDayIndex
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => scrollToDay(di, day.id)}
                  className={`h-11 min-h-[44px] px-4 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    active
                      ? "bg-accent-orange text-black shadow-md scale-105"
                      : "bg-white/5 text-white/80 border border-border-subtle hover:bg-white/10"
                  }`}
                >
                  {day.rest ? "REST" : `D${di + 1}`}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => addDay(false)}
              className="h-11 min-h-[44px] px-3.5 rounded-full bg-white/10 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="size-3.5" /> Day
            </button>
          </div>
        )}

        {/* DIET MEAL NAVIGATION STRIP (sticky below top bar) */}
        {d.diet && plan && (
          <div className="sticky top-[69px] z-30 -mx-4 px-4 py-2 bg-bg-primary/95 backdrop-blur-md border-b border-border-subtle/70 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {plan.rows
              .filter((r) => r.type === "meal")
              .map((m, mi) => {
                const active = activeMealId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => scrollToMeal(m.id)}
                    className={`h-11 min-h-[44px] px-4 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      active
                        ? "bg-accent-orange text-black shadow-md scale-105"
                        : "bg-white/5 text-white/80 border border-border-subtle hover:bg-white/10"
                    }`}
                  >
                    {plain(m.label) || `M${mi + 1}`}
                    {m.option ? ` (${m.option})` : ""}
                  </button>
                )
              })}
            <button
              type="button"
              onClick={addMeal}
              className="h-11 min-h-[44px] px-3.5 rounded-full bg-white/10 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="size-3.5" /> Meal
            </button>
          </div>
        )}

        {/* 3-STEP HINT ON NEW PLAN */}
        {d.workout && d.workout.days.every((d) => d.rows.length === 0) && !hideHint && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-accent-orange/20 to-accent-orange/5 border border-accent-orange/40 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-accent-orange flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> 3 Steps to build a plan
              </p>
              <p className="text-sm font-semibold text-white/90">
                1. Tap <span className="text-accent-orange font-bold">+ Add</span> or Quick Day · 2. Tap <span className="font-bold">PDF</span> to preview · 3. Tap <span className="font-bold">Send</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHideHint(true)}
              className="size-8 rounded-full bg-white/10 grid place-items-center text-text-muted hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Title + Period + Plan Switches */}
        <div className="pt-4 space-y-3">
          <textarea
            value={doc.title}
            onChange={(e) =>
              edit((x) => {
                x.title = e.target.value.replace(/\n/g, " ")
              })
            }
            rows={doc.title.length > 22 ? 2 : 1}
            placeholder="Plan name, e.g. High Intensity High Volume"
            className="w-full bg-transparent font-heading italic text-3xl leading-tight outline-none resize-none placeholder:text-white/25"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>From</Label>
              <input
                type="date"
                value={doc.period_start ?? ""}
                onChange={(e) =>
                  edit((x) => {
                    x.period_start = e.target.value || null
                  })
                }
                className={`${inputCls} h-12 [color-scheme:dark]`}
              />
            </div>
            <div>
              <Label>To</Label>
              <input
                type="date"
                value={doc.period_end ?? ""}
                onChange={(e) =>
                  edit((x) => {
                    x.period_end = e.target.value || null
                  })
                }
                className={`${inputCls} h-12 [color-scheme:dark]`}
              />
            </div>
          </div>

          {doc.kind === "workout" && d.workout && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Heading</Label>
                <input
                  value={d.workout.heading}
                  onChange={(e) =>
                    data((pd) => {
                      pd.workout!.heading = e.target.value
                    })
                  }
                  className={`${inputCls} h-12`}
                />
              </div>
              <div>
                <Label hint="red tag">Phase</Label>
                <input
                  value={d.workout.tag}
                  onChange={(e) =>
                    data((pd) => {
                      pd.workout!.tag = e.target.value
                    })
                  }
                  placeholder="DELOAD / HYPERTROPHY"
                  className={`${inputCls} h-12`}
                />
              </div>
            </div>
          )}

          {/* Settings Badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen({ k: "header" })}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-white/5 border border-border-subtle text-xs font-semibold cursor-pointer hover:bg-white/10"
            >
              Client & Measurements
            </button>
            {d.workout && <Toggle
              on={d.showWhy !== false}
              label="Science notes"
              onClick={() =>
                data((pd) => {
                  pd.showWhy = pd.showWhy === false ? true : false
                })
              }
            />}
            <Toggle
              on={d.showRules}
              label="Rules pages"
              onClick={() =>
                data((pd) => {
                  pd.showRules = !pd.showRules
                })
              }
            />
            {d.base && (
              <Toggle
                on={d.markChanges}
                label="Changes in red"
                onClick={() =>
                  data((pd) => {
                    pd.markChanges = !pd.markChanges
                  })
                }
              />
            )}
          </div>
        </div>

        {/* ================= WORKOUT DAYS ================= */}
        {d.workout && (
          <div className="mt-6 space-y-5">
            {d.workout.days.length === 0 && (
              <div className="p-8 text-center rounded-3xl border border-dashed border-border-subtle bg-white/[0.02] space-y-3">
                <p className="text-text-muted font-medium text-sm">No workout days yet</p>
                <button
                  type="button"
                  onClick={() => addDay(false)}
                  className="h-13 px-6 rounded-2xl bg-accent-orange text-black font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-accent-orange/20"
                >
                  <Plus className="size-4" /> Training day
                </button>
              </div>
            )}
            {d.workout.days.map((day, di) => {
              const isCollapsed = collapsedDays[day.id] ?? false

              // Group calculations for the day
              const groupLetters = new Map<string, string>()
              const groupCounts = new Map<string, number>()
              let letterCharCode = 65

              day.rows.forEach((r) => {
                if (r.group) {
                  if (!groupLetters.has(r.group)) {
                    groupLetters.set(r.group, String.fromCharCode(letterCharCode++))
                  }
                  groupCounts.set(r.group, (groupCounts.get(r.group) ?? 0) + 1)
                }
              })

              let n = 0
              const groupItemIndex = new Map<string, number>()

              return (
                <section
                  key={day.id}
                  id={`day-section-${day.id}`}
                  className="rounded-3xl bg-bg-card border border-border-subtle overflow-hidden transition-all shadow-sm"
                >
                  {/* Day Header */}
                  <div className="px-4 pt-3.5 pb-2.5 bg-white/[0.02] border-b border-border-subtle/70">
                    {/* line 1: full-width title so it never gets cut */}
                    <div className="flex items-start gap-2">
                      {day.rest && <Moon className="size-5 text-accent-orange shrink-0 mt-1.5" />}
                      <textarea
                        value={day.title}
                        rows={day.title.length > 24 ? 2 : 1}
                        onChange={(e) =>
                          data((pd) => {
                            findDay(pd, day.id).title = e.target.value.replace(/\n/g, " ")
                          })
                        }
                        className="min-w-0 flex-1 bg-transparent font-heading italic text-xl leading-snug outline-none font-semibold resize-none"
                      />
                    </div>
                    {/* line 2: count + fold + menu */}
                    <div className="flex items-center justify-end gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => toggleDayCollapse(day.id)}
                      className="mr-auto text-xs text-text-muted px-2.5 py-1 rounded-full bg-white/5 hover:text-white cursor-pointer"
                    >
                      {day.rows.length} {day.rows.length === 1 ? "item" : "items"}
                    </button>

                    {/* Expand/Collapse Chevron */}
                    <button
                      type="button"
                      onClick={() => toggleDayCollapse(day.id)}
                      aria-label="Toggle day collapse"
                      className="size-11 min-h-[44px] grid place-items-center rounded-full bg-white/5 cursor-pointer text-text-muted hover:text-white"
                    >
                      <ChevronDown
                        className={`size-5 transition-transform duration-200 ${
                          isCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                      />
                    </button>

                    {/* Day Menu */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpen({
                          k: "actions",
                          title: day.title,
                          actions: dayActions(day, di),
                        })
                      }
                      aria-label="Day options"
                      className="size-11 min-h-[44px] grid place-items-center rounded-full bg-white/5 cursor-pointer text-text-muted hover:text-white"
                    >
                      <MoreHorizontal className="size-5" />
                    </button>
                    </div>
                  </div>

                  {/* Day Rows (when not collapsed and not rest) */}
                  {!day.rest && !isCollapsed && (
                    <>
                      {day.rows.length === 0 ? (
                        <div className="p-8 text-center space-y-3">
                          <p className="text-base text-text-muted">Tap + Add to put exercises here</p>
                          <div className="flex justify-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setOpen({ k: "add", day: day.id, kind: "exercise" })}
                              className="h-12 min-h-[48px] px-5 rounded-xl bg-accent-orange text-black font-bold text-sm cursor-pointer"
                            >
                              + Exercises
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpen({ k: "quickday", day: day.id })}
                              className="h-12 min-h-[48px] px-5 rounded-xl bg-white/10 text-white font-bold text-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <Zap className="size-4 text-accent-orange" /> Quick Day
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-border-subtle">
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
                                label = ++n
                              }
                            }

                            const isLastInGroup =
                              isGrouped &&
                              r.group &&
                              groupItemIndex.get(r.group) === groupCounts.get(r.group)
                            const groupInfo = r.group && day.groups ? day.groups[r.group] : undefined
                            const totalInGroup = r.group ? groupCounts.get(r.group) ?? 2 : 2
                            const groupTypeName =
                              totalInGroup === 2 ? "SUPERSET" : totalInGroup === 3 ? "TRI-SET" : "GIANT SET"
                            const letter = r.group ? groupLetters.get(r.group) : ""

                            if (r.type === "banner") {
                              return (
                                <div key={r.id} className="flex items-center bg-danger/[0.07]">
                                  <button
                                    type="button"
                                    onClick={() => setOpen({ k: "banner", day: day.id, row: r.id })}
                                    className="flex-1 text-left px-4 py-3.5 text-danger font-semibold text-sm cursor-pointer"
                                  >
                                    {plain(r.name) || "Red line"}
                                  </button>
                                  <More
                                    onClick={() =>
                                      setOpen({
                                        k: "actions",
                                        title: plain(r.name),
                                        actions: rowActions(day, r, ri),
                                      })
                                    }
                                  />
                                </div>
                              )
                            }

                            const isSwiped = swipedRowId === r.id

                            return (
                              <div key={r.id}>
                                <div
                                  className={`relative flex items-stretch transition-colors overflow-hidden ${
                                    isGrouped
                                      ? "border-l-4 border-accent-orange bg-accent-orange/[0.03]"
                                      : r.type === "warmup"
                                      ? "bg-white/[0.02]"
                                      : ""
                                  }`}
                                  onTouchStart={(e) => {
                                    const touch = e.touches[0]
                                    ;(e.currentTarget as any)._touchStartX = touch.clientX
                                  }}
                                  onTouchEnd={(e) => {
                                    const startX = (e.currentTarget as any)._touchStartX
                                    if (startX !== undefined) {
                                      const delta = startX - e.changedTouches[0].clientX
                                      if (delta > 50) setSwipedRowId(r.id)
                                      else if (delta < -30) setSwipedRowId(null)
                                    }
                                  }}
                                >
                                  {/* Row Content */}
                                  <button
                                    type="button"
                                    onClick={() => setOpen({ k: "row", day: day.id, row: r.id })}
                                    className="flex-1 min-w-0 text-left px-4 py-3.5 flex gap-3 cursor-pointer"
                                  >
                                    {/* Number / Label badge */}
                                    {typeof label === "string" ? (
                                      <span className="size-8 min-h-[32px] shrink-0 rounded-lg bg-accent-orange text-black text-xs font-bold grid place-items-center">
                                        {label}
                                      </span>
                                    ) : label > 0 ? (
                                      <span className="size-7 min-h-[28px] shrink-0 rounded-full bg-accent-orange text-black text-sm font-bold grid place-items-center">
                                        {label}
                                      </span>
                                    ) : (
                                      <span className="size-7 shrink-0 grid place-items-center">
                                        <span className="size-2 rounded-full bg-accent-orange/70" />
                                      </span>
                                    )}

                                    {/* Exercise details */}
                                    <span className="min-w-0 flex-1">
                                      <span className="block font-semibold text-base leading-snug">
                                        {plain(r.name) || <span className="text-text-muted">Tap to fill</span>}
                                      </span>

                                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-text-muted">
                                        {r.sets && (
                                          <span className="text-white/90 font-semibold">
                                            {r.sets.replace(/\s*\n\s*/g, " ")}
                                          </span>
                                        )}
                                        {r.kind && (
                                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] uppercase font-bold text-text-muted">
                                            {r.kind}
                                          </span>
                                        )}
                                        {r.links.length > 0 && (
                                          <span className="flex items-center gap-1 text-accent-orange font-semibold">
                                            <Play className="size-3 fill-current" />
                                            {r.links.length}
                                          </span>
                                        )}
                                        {r.cues.length > 0 && (
                                          <span>
                                            {r.cues.length} tip{r.cues.length > 1 ? "s" : ""}
                                          </span>
                                        )}
                                        {changedIds.has(r.id) && (
                                          <span className="text-danger font-bold">changed</span>
                                        )}
                                      </span>

                                      {/* Why preview if available */}
                                      {r.why && (
                                        <span className="block text-xs text-text-muted/70 italic mt-1 line-clamp-1">
                                          Why: {r.why}
                                        </span>
                                      )}
                                    </span>
                                  </button>

                                  {/* Right actions or swiped action drawer */}
                                  {isSwiped ? (
                                    <div className="flex items-stretch shrink-0 animate-in slide-in-from-right duration-150">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          data((pd) => {
                                            findDay(pd, day.id).rows.splice(ri + 1, 0, {
                                              ...structuredClone(r),
                                              id: uid(),
                                            })
                                          })
                                          setSwipedRowId(null)
                                          toast.success("Duplicated")
                                        }}
                                        className="w-14 bg-white/15 grid place-items-center text-white cursor-pointer"
                                      >
                                        <Copy className="size-5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          deleteRowWithToast(day.id, r.id)
                                          setSwipedRowId(null)
                                        }}
                                        className="w-14 bg-danger text-white grid place-items-center cursor-pointer"
                                      >
                                        <Trash2 className="size-5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <More
                                      onClick={() =>
                                        setOpen({
                                          k: "actions",
                                          title: plain(r.name) || "Exercise",
                                          actions: rowActions(day, r, ri),
                                        })
                                      }
                                    />
                                  )}
                                </div>

                                {/* Group note footer (editable) */}
                                {isLastInGroup && r.group && (
                                  <div
                                    onClick={() =>
                                      setOpen({
                                        k: "group",
                                        day: day.id,
                                        groupId: r.group!,
                                      })
                                    }
                                    className="p-3 mx-3 my-1.5 rounded-xl bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-between cursor-pointer hover:bg-accent-orange/15 transition-colors"
                                  >
                                    <div className="min-w-0 flex-1 pr-2">
                                      <p className="text-xs font-bold uppercase tracking-wider text-accent-orange flex items-center gap-1.5">
                                        <Layers className="size-3.5" /> {groupTypeName} {letter} Note
                                      </p>
                                      <p className="text-xs text-white/80 mt-0.5 line-clamp-1 italic">
                                        {groupInfo?.note || "Perform consecutively with zero rest."}
                                      </p>
                                    </div>
                                    <span className="text-xs font-bold text-accent-orange shrink-0">
                                      Rest {groupInfo?.restAfterSec ?? 90}s
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Day bottom row add buttons */}
                      <div className="grid grid-cols-4 gap-2 p-3 border-t border-border-subtle bg-white/[0.01]">
                        <button
                          type="button"
                          onClick={() => setOpen({ k: "add", day: day.id, kind: "exercise" })}
                          className="h-12 min-h-[48px] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer bg-accent-orange/15 text-accent-orange border border-accent-orange/30"
                        >
                          <Plus className="size-4" /> Exercise
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpen({ k: "add", day: day.id, kind: "warmup", initialMuscle: "Stretch" })}
                          className="h-12 min-h-[48px] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10"
                        >
                          <Plus className="size-4" /> Stretch
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpen({ k: "quickday", day: day.id })}
                          className="h-12 min-h-[48px] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10"
                        >
                          <Zap className="size-4 text-accent-orange" /> Quick
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const id = uid()
                            data((pd) => {
                              findDay(pd, day.id).rows.push({
                                id,
                                type: "banner",
                                name: "",
                                links: [],
                                cues: [],
                                sets: "",
                              })
                            })
                            setOpen({ k: "banner", day: day.id, row: id })
                          }}
                          className="h-12 min-h-[48px] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10"
                        >
                          <Plus className="size-4" /> Red line
                        </button>
                      </div>
                    </>
                  )}
                </section>
              )
            })}

            {/* Bottom Add Day Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => addDay(false)}
                className="h-14 min-h-[52px] rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="size-5 text-accent-orange" /> Training day
              </button>
              <button
                type="button"
                onClick={() => addDay(true)}
                className="h-14 min-h-[52px] rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-base flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Moon className="size-5" /> Rest day
              </button>
              <button
                type="button"
                onClick={() => setOpen({ k: "copyday" })}
                className="col-span-2 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Copy className="size-4 text-accent-orange" /> Copy a day from another plan
              </button>
            </div>
          </div>
        )}

        {/* ================= DIET SECTION ================= */}
        {d.diet && (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {plans.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTab(i)}
                  className={`h-12 min-h-[48px] px-5 rounded-full whitespace-nowrap text-sm font-bold cursor-pointer transition-all ${
                    i === tab ? "bg-accent-orange text-black" : "bg-white/5 border border-border-subtle"
                  }`}
                >
                  {plain(p.title) || `Diet ${i + 1}`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  data((pd) => {
                    pd.diet!.plans.push({ id: uid(), title: "NON - VEG DIET PLAN", rows: [] })
                  })
                  setTab(plans.length)
                }}
                className="h-12 min-h-[48px] px-4 rounded-full whitespace-nowrap text-sm font-bold bg-white/5 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="size-4" /> Diet
              </button>
            </div>

            {plan && (
              <div className="space-y-4">
                {/* Diet Plan Title Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-bg-card border border-border-subtle rounded-2xl">
                  <input
                    value={plan.title}
                    onChange={(e) =>
                      data((pd) => {
                        findPlan(pd, plan.id).title = e.target.value
                      })
                    }
                    className="min-w-0 flex-1 bg-transparent font-heading italic text-xl outline-none"
                    placeholder="DIET PLAN TITLE"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setOpen({
                        k: "actions",
                        title: plan.title,
                        actions: planActions(plan, tab),
                      })
                    }
                    aria-label="Diet options"
                    className="size-11 min-h-[44px] grid place-items-center rounded-full bg-white/5 cursor-pointer"
                  >
                    <MoreHorizontal className="size-5" />
                  </button>
                </div>

                {/* List of Rows: Foldable Meal Cards and Banners */}
                {plan.rows.map((r, ri) => {
                  if (r.type === "banner") {
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-2xl bg-danger/[0.08] border border-danger/30 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpen({ k: "dbanner", plan: plan.id, row: r.id })}
                          className="flex-1 text-left px-4 py-3.5 text-danger font-bold text-sm cursor-pointer"
                        >
                          {plain(r.label) || "Red line / Notice (tap to edit)"}
                        </button>
                        <More
                          onClick={() =>
                            setOpen({
                              k: "actions",
                              title: plain(r.label) || "Red line",
                              actions: mealActions(plan, r, ri),
                            })
                          }
                        />
                      </div>
                    )
                  }

                  const isCollapsed = collapsedMeals[r.id] ?? false

                  return (
                    <section
                      key={r.id}
                      id={`meal-card-${r.id}`}
                      className="rounded-3xl bg-bg-card border border-border-subtle overflow-hidden transition-all shadow-sm"
                    >
                      {/* Meal Card Header (Tap to fold/unfold) */}
                      <div className="flex items-center justify-between gap-2 px-4 py-3.5 bg-white/[0.02]">
                        <button
                          type="button"
                          onClick={() => toggleMealCollapse(r.id)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="size-8 grid place-items-center rounded-xl bg-white/5 text-accent-orange shrink-0">
                            {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-bold text-base text-white">{r.label || "Meal"}</span>
                              {r.sub && <span className="text-text-muted text-xs italic">{r.sub}</span>}
                              {r.option && (
                                <span className="text-accent-orange text-xs font-bold px-2 py-0.5 rounded-full bg-accent-orange/15 border border-accent-orange/30">
                                  {r.option}
                                </span>
                              )}
                              {changedIds.has(r.id) && (
                                <span className="text-danger text-xs font-bold">changed</span>
                              )}
                            </div>
                            {isCollapsed && (
                              <p className="text-xs text-text-muted truncate mt-0.5">
                                {r.items.length > 0
                                  ? r.items.map((it) => plain(it.text)).join(" · ")
                                  : "No foods added yet"}
                              </p>
                            )}
                          </div>
                        </button>

                        <More
                          onClick={() =>
                            setOpen({
                              k: "actions",
                              title: r.label || "Meal",
                              actions: mealActions(plan, r, ri),
                            })
                          }
                        />
                      </div>

                      {/* Meal Card Body (When unfolded) */}
                      {!isCollapsed && (
                        <div className="p-4 space-y-4 border-t border-border-subtle bg-black/10">
                          {/* Meal Label & Subtitle Input */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label>Meal Name</Label>
                              <input
                                value={r.label}
                                onChange={(e) =>
                                  data((pd) => {
                                    const row = findPlan(pd, plan.id).rows.find((x) => x.id === r.id)
                                    if (row) row.label = e.target.value
                                  })
                                }
                                placeholder="MEAL 1"
                                className={`${inputCls} h-11 text-sm font-semibold`}
                              />
                            </div>
                            <div>
                              <Label>Time / Note</Label>
                              <input
                                value={r.sub}
                                onChange={(e) =>
                                  data((pd) => {
                                    const row = findPlan(pd, plan.id).rows.find((x) => x.id === r.id)
                                    if (row) row.sub = e.target.value
                                  })
                                }
                                placeholder="Breakfast / 9:00 AM"
                                className={`${inputCls} h-11 text-sm`}
                              />
                            </div>
                          </div>

                          {/* Foods List */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                Foods ({r.items.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpen({ k: "food_picker", plan: plan.id, mealId: r.id })}
                                className="text-xs font-bold text-accent-orange hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Search className="size-3.5" /> Pick from library
                              </button>
                            </div>

                            {r.items.length === 0 && (
                              <p className="text-xs text-text-muted py-2 italic text-center">
                                No foods added yet. Tap "Pick Food" below to choose from Aman's library.
                              </p>
                            )}

                            {r.items.map((it, itemIdx) => (
                              <div
                                key={itemIdx}
                                className="p-3 rounded-2xl bg-white/[0.03] border border-border-subtle/80 space-y-2.5"
                              >
                                <div className="flex items-start gap-2">
                                  <textarea
                                    value={it.text}
                                    onChange={(e) =>
                                      data((pd) => {
                                        const row = findPlan(pd, plan.id).rows.find((x) => x.id === r.id)
                                        if (row && row.items[itemIdx]) row.items[itemIdx].text = e.target.value
                                      })
                                    }
                                    rows={Math.min(3, Math.max(1, Math.ceil(it.text.length / 32)))}
                                    placeholder="e.g. 150g Chicken Breast"
                                    className={`${inputCls} py-2 text-sm leading-snug flex-1 resize-none`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      data((pd) => {
                                        const row = findPlan(pd, plan.id).rows.find((x) => x.id === r.id)
                                        if (row) row.items.splice(itemIdx, 1)
                                      })
                                    }
                                    aria-label="Remove food"
                                    className="size-10 min-h-[40px] grid place-items-center rounded-xl bg-danger/10 text-danger shrink-0 cursor-pointer"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>

                                {/* Quantity Stepper Chips */}
                                <QuantityChips
                                  text={it.text}
                                  onChange={(newText) =>
                                    data((pd) => {
                                      const row = findPlan(pd, plan.id).rows.find((x) => x.id === r.id)
                                      if (row && row.items[itemIdx]) row.items[itemIdx].text = newText
                                    })
                                  }
                                />
                              </div>
                            ))}

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setOpen({ k: "food_picker", plan: plan.id, mealId: r.id })}
                                className="flex-1 h-12 min-h-[48px] rounded-xl bg-accent-orange/15 text-accent-orange font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform border border-accent-orange/30"
                              >
                                <Utensils className="size-4" /> Pick Food
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  data((pd) => {
                                    const row = findPlan(pd, plan.id).rows.find((x) => x.id === r.id)
                                    if (row) row.items.push({ text: "" })
                                  })
                                }
                                className="h-12 min-h-[48px] px-4 rounded-xl bg-white/5 text-white/80 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform hover:bg-white/10 border border-white/10"
                              >
                                <Plus className="size-4" /> Type New
                              </button>
                            </div>
                          </div>

                          {/* Supplements Section (collapsible) */}
                          <details className="pt-2 border-t border-border-subtle/50 group/sup">
                            <summary className="text-xs font-semibold text-text-muted flex items-center justify-between cursor-pointer list-none py-1">
                              <span>Supplements ({r.supplements.length})</span>
                              <Plus className="size-3.5 text-accent-orange" />
                            </summary>
                            <div className="pt-2 space-y-2">
                              {r.supplements.map((sup, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2">
                                  <input
                                    value={sup.text}
                                    onChange={(e) =>
                                      data((pd) => {
                                        const row = findPlan(pd, plan.id).rows.find((x) => x.id === r.id)
                                        if (row && row.supplements[sIdx]) row.supplements[sIdx].text = e.target.value
                                      })
                                    }
                                    className={`${inputCls} h-9 text-xs flex-1`}
                                    placeholder="e.g. 1 Multivitamin"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      data((pd) => {
                                        const row = findPlan(pd, plan.id).rows.find((x) => x.id === r.id)
                                        if (row) row.supplements.splice(sIdx, 1)
                                      })
                                    }
                                    className="size-9 grid place-items-center rounded-lg bg-danger/10 text-danger shrink-0 cursor-pointer"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  data((pd) => {
                                    const row = findPlan(pd, plan.id).rows.find((x) => x.id === r.id)
                                    if (row) row.supplements.push({ text: "" })
                                  })
                                }
                                className="h-9 px-3 rounded-lg bg-white/5 text-xs text-white/80 font-medium flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="size-3" /> Add supplement
                              </button>
                            </div>
                          </details>

                          {/* 1-Tap Option Action */}
                          <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => duplicateMealAsOption(plan, r, ri)}
                              className="text-xs font-bold text-accent-orange hover:underline flex items-center gap-1 cursor-pointer py-1.5"
                            >
                              <Copy className="size-3.5" /> Add another option of this meal
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setOpen({
                                  k: "actions",
                                  title: r.label || "Meal",
                                  actions: mealActions(plan, r, ri),
                                })
                              }
                              className="text-xs text-text-muted hover:text-white flex items-center gap-1 cursor-pointer py-1.5"
                            >
                              More options <ChevronDown className="size-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  )
                })}

                {/* Bottom Add Buttons for Diet */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <AddBtn
                    label="Meal"
                    primary
                    onClick={addMeal}
                  />
                  <AddBtn
                    label="Red line"
                    onClick={() => {
                      const id = uid()
                      data((pd) => {
                        findPlan(pd, plan.id).rows.push({
                          id,
                          type: "banner",
                          label: "",
                          sub: "",
                          option: "",
                          items: [],
                          supplements: [],
                        })
                      })
                      setOpen({ k: "dbanner", plan: plan.id, row: id })
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rules pages & sign-off collapsible */}
        <details className="mt-6 rounded-3xl bg-bg-card border border-border-subtle p-4 group">
          <summary className="cursor-pointer font-semibold flex items-center gap-2 list-none">
            <FileText className="size-5 text-accent-orange" /> Rules pages & sign-off
          </summary>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-text-muted">
              “- ” makes a bullet, “1. ” a number, *stars* make text red.
            </p>
            <div>
              <Label>Rules</Label>
              <textarea
                value={d.workout?.rules ?? d.diet?.rules ?? ""}
                onChange={(e) =>
                  data((pd) => {
                    if (pd.workout) pd.workout.rules = e.target.value
                    else if (pd.diet) pd.diet.rules = e.target.value
                  })
                }
                rows={10}
                className={`${inputCls} py-3 text-sm leading-relaxed`}
              />
            </div>
            {d.diet && (
              <div>
                <Label>Cardio, steps & breathing page</Label>
                <textarea
                  value={d.diet.cardio}
                  onChange={(e) =>
                    data((pd) => {
                      pd.diet!.cardio = e.target.value
                    })
                  }
                  rows={6}
                  className={`${inputCls} py-3 text-sm leading-relaxed`}
                />
              </div>
            )}
            {d.workout && (
              <div>
                <Label>Note at the end</Label>
                <textarea
                  value={d.workout.note}
                  onChange={(e) =>
                    data((pd) => {
                      pd.workout!.note = e.target.value
                    })
                  }
                  rows={2}
                  className={`${inputCls} py-3 text-sm`}
                />
              </div>
            )}
            <div>
              <Label>Sign-off</Label>
              <textarea
                value={d.workout?.closing ?? d.diet?.closing ?? ""}
                onChange={(e) =>
                  data((pd) => {
                    if (pd.workout) pd.workout.closing = e.target.value
                    else if (pd.diet) pd.diet.closing = e.target.value
                  })
                }
                rows={3}
                className={`${inputCls} py-3 text-sm`}
              />
            </div>
          </div>
        </details>
      </div>

      {/* ================= SINGLE STICKY BOTTOM BAR ================= */}
      {/* Phone thumb-zone: [+ Add] [Superset] [PDF] [Send] */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 bg-[#121212]/95 backdrop-blur-xl border-t border-border-subtle/80 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="px-3 py-2 flex items-center justify-between gap-2">
          {/* + Add Button */}
          <button
            type="button"
            onClick={() => {
              if (d.diet && plan) {
                setOpen({ k: "diet_add_menu", plan: plan.id })
              } else if (activeDay) {
                setOpen({ k: "add_menu", day: activeDay.id })
              }
            }}
            className="flex-1 h-13 min-h-[50px] rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
          >
            <Plus className="size-4 text-accent-orange" /> Add
          </button>

          {/* Superset Button */}
          {d.workout && (
            <button
              type="button"
              onClick={() => {
                if (activeDay) {
                  setOpen({ k: "superset", day: activeDay.id })
                }
              }}
              className="flex-1 h-13 min-h-[50px] rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <Layers className="size-4 text-accent-orange" /> Superset
            </button>
          )}

          {/* PDF Preview Button */}
          <button
            type="button"
            onClick={openPreview}
            className="flex-1 h-13 min-h-[50px] rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
          >
            <Eye className="size-4" /> PDF
          </button>

          {/* Send / Done Button (Orange) */}
          {!doc.is_template ? (
            <button
              type="button"
              onClick={() => setOpen({ k: "send" })}
              className="flex-1 h-13 min-h-[50px] rounded-2xl bg-accent-orange text-black font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform shadow-lg shadow-accent-orange/20"
            >
              <Send className="size-4" /> Send
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                saveDoc(doc.id, {
                  title: doc.title,
                  data: doc.data,
                })
                  .then(() => toast.success("Template saved!"))
                  .catch(() => toast.error("Could not save template"))
              }}
              className="flex-1 h-13 min-h-[50px] rounded-2xl bg-accent-orange text-black font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <Check className="size-4" /> Save
            </button>
          )}
        </div>
      </div>

      {/* ================= SHEETS ================= */}

      {/* Row Edit Sheet */}
      {open?.k === "row" && openRow && (
        <RowSheet
          row={openRow}
          library={library}
          clientAge={clientAge}
          onClose={() => setOpen(null)}
          onSave={(nr) =>
            data((pd) => {
              const day = findDay(pd, open.day)
              day.rows = day.rows.map((x) => (x.id === nr.id ? nr : x))
            })
          }
        />
      )}

      {/* Superset Multi-select Sheet */}
      {open?.k === "superset" && (
        <SupersetPickerSheet
          dayTitle={d.workout?.days.find((x) => x.id === open.day)?.title ?? "Current Day"}
          exercises={
            d.workout?.days
              .find((x) => x.id === open.day)
              ?.rows.filter((r) => r.type === "exercise") ?? []
          }
          onClose={() => setOpen(null)}
          onGroup={(selIds) => handleGroupExercises(open.day, selIds)}
        />
      )}

      {/* Superset Group Settings Sheet */}
      {open?.k === "group" && (
        <GroupSheet
          groupLabel="Superset"
          note={
            d.workout?.days.find((x) => x.id === open.day)?.groups?.[open.groupId]?.note ??
            "Perform consecutively with zero rest."
          }
          restAfterSec={
            d.workout?.days.find((x) => x.id === open.day)?.groups?.[open.groupId]?.restAfterSec ?? 90
          }
          onClose={() => setOpen(null)}
          onSave={(note, restAfterSec) =>
            data((pd) => {
              const day = findDay(pd, open.day)
              if (!day.groups) day.groups = {}
              day.groups[open.groupId] = { note, restAfterSec }
            })
          }
          onUngroup={() => {
            ungroupWholeGroup(open.day, open.groupId)
          }}
        />
      )}

      {/* Quick Day Split Chooser Sheet */}
      {open?.k === "copyday" && (
        <CopyDaySheet
          currentId={doc.id}
          onClose={() => setOpen(null)}
          onPick={(day) => {
            data((pd) => {
              day.title = day.title.replace(/^DAY\s*\d+/i, `DAY ${pd.workout!.days.length + 1}`)
              pd.workout!.days.push(day)
              setActiveDayIndex(pd.workout!.days.length - 1)
            })
            setOpen(null)
            toast.success("Day copied")
          }}
        />
      )}
      {open?.k === "quickday" && (
        <ActionSheet
          title="Choose Split for Quick Day"
          onClose={() => setOpen(null)}
          actions={[
            {
              label: "Upper Body (Chest, Back, Shoulders, Arms)",
              run: () => applyQuickDay(open.day, "upper"),
            },
            {
              label: "Lower Body (Quads, Hamstrings, Glutes, Calves)",
              run: () => applyQuickDay(open.day, "lower"),
            },
            {
              label: "Push (Chest, Delts, Triceps)",
              run: () => applyQuickDay(open.day, "push"),
            },
            {
              label: "Pull (Lats, Upper Back, Biceps)",
              run: () => applyQuickDay(open.day, "pull"),
            },
            {
              label: "Legs (Quad / Hamstring / Glute heavy)",
              run: () => applyQuickDay(open.day, "legs"),
            },
            {
              label: "Full Body (Compound Split)",
              run: () => applyQuickDay(open.day, "full"),
            },
          ]}
        />
      )}

      {/* Quick Add Menu Sheet from Bottom Bar */}
      {open?.k === "add_menu" && (
        <ActionSheet
          title="Add to Current Day"
          onClose={() => setOpen(null)}
          actions={[
            {
              label: "+ Exercises (Gym library & database)",
              run: () => setOpen({ k: "add", day: open.day, kind: "exercise" }),
            },
            {
              label: "+ Stretches (Dynamic warm-up & static cool-down)",
              run: () => setOpen({ k: "add", day: open.day, kind: "warmup", initialMuscle: "Stretch" }),
            },
            {
              label: "+ Cardio Warm-up / Machine",
              run: () => newRow(open.day, "warmup", "cardio"),
            },
            {
              label: "+ Red Banner Line",
              run: () => {
                const id = uid()
                data((pd) => {
                  findDay(pd, open.day).rows.push({
                    id,
                    type: "banner",
                    name: "",
                    links: [],
                    cues: [],
                    sets: "",
                  })
                })
                setOpen({ k: "banner", day: open.day, row: id })
              },
            },
            {
              label: "⚡ Quick Day (Full Split with Warm-up & Stretches)",
              run: () => setOpen({ k: "quickday", day: open.day }),
            },
          ]}
        />
      )}

      {/* Banner / Note Sheet */}
      {open?.k === "banner" &&
        openBannerDay &&
        (open.row === "__notes" ? (
          <BannerSheet
            text={`${openBannerDay.leftNote}\n${openBannerDay.rightNote}`}
            library={[]}
            onClose={() => setOpen(null)}
            onSave={(t) =>
              data((pd) => {
                const [l, ...rest] = t.split("\n")
                const day = findDay(pd, open.day)
                day.leftNote = l ?? ""
                day.rightNote = rest.join(" ")
              })
            }
          />
        ) : openBanner ? (
          <BannerSheet
            text={openBanner.name}
            library={library}
            onClose={() => setOpen(null)}
            onSave={(t) =>
              data((pd) => {
                const day = findDay(pd, open.day)
                if (!t) day.rows = day.rows.filter((x) => x.id !== openBanner.id)
                else day.rows.find((x) => x.id === openBanner.id)!.name = t
              })
            }
          />
        ) : null)}

      {/* Meal & Diet Sheets */}
      {open?.k === "meal" && openMeal && (
        <MealSheet
          row={openMeal}
          library={library}
          onClose={() => setOpen(null)}
          onSave={(nr) =>
            data((pd) => {
              const p = findPlan(pd, open.plan)
              p.rows = p.rows.map((x) => (x.id === nr.id ? nr : x))
            })
          }
        />
      )}
      {open?.k === "dbanner" && openMeal && (
        <BannerSheet
          text={openMeal.label}
          library={library}
          onClose={() => setOpen(null)}
          onSave={(t) =>
            data((pd) => {
              const p = findPlan(pd, open.plan)
              if (!t) p.rows = p.rows.filter((x) => x.id !== openMeal.id)
              else p.rows.find((x) => x.id === openMeal.id)!.label = t
            })
          }
        />
      )}

      {/* Add Rows Picker with Stretches / Muscle Filtering */}
      {open?.k === "add" && (
        <AddRowsPicker
          kind={open.kind}
          library={library}
          initialMuscle={open.initialMuscle}
          onClose={() => setOpen(null)}
          onNew={() => newRow(open.day, open.kind, open.initialMuscle === "Stretch" ? "stretch" : "strength")}
          onAdd={(items) => {
            if (open.initialMuscle === "Stretch") {
              addStretchesToDay(open.day, items)
            } else {
              data((pd) => {
                const day = findDay(pd, open.day)
                day.rows.push(
                  ...items.map((it) => ({
                    id: uid(),
                    type: open.kind,
                    name: it.name,
                    links: it.data.links ?? [],
                    cues: it.data.cues ?? [],
                    sets: it.data.sets ?? "3 × 10-15 Reps",
                    kind: it.data.kind ?? "strength",
                    why: it.data.why,
                  })),
                )
              })
              setOpen(null)
              toast.success(`${items.length} added`)
            }
          }}
        />
      )}

      {/* Diet Add Menu Sheet */}
      {open?.k === "diet_add_menu" && plan && (
        <ActionSheet
          title="Add to Diet"
          onClose={() => setOpen(null)}
          actions={[
            {
              label: "+ Pick Food from Library",
              run: () => {
                const meals = plan.rows.filter((r) => r.type === "meal")
                if (meals.length > 0) {
                  const target =
                    activeMealId && meals.some((m) => m.id === activeMealId)
                      ? activeMealId
                      : meals[0].id
                  setOpen({ k: "food_picker", plan: plan.id, mealId: target })
                } else {
                  const id = uid()
                  data((pd) => {
                    findPlan(pd, plan.id).rows.push({
                      id,
                      type: "meal",
                      label: "MEAL 1",
                      sub: "",
                      option: "",
                      items: [],
                      supplements: [],
                    })
                  })
                  setOpen({ k: "food_picker", plan: plan.id, mealId: id })
                }
              },
            },
            {
              label: "+ New Meal (e.g. MEAL 2)",
              run: () => addMeal(),
            },
            {
              label: "+ Red Line / Notice",
              run: () => {
                const id = uid()
                data((pd) => {
                  findPlan(pd, plan.id).rows.push({
                    id,
                    type: "banner",
                    label: "",
                    sub: "",
                    option: "",
                    items: [],
                    supplements: [],
                  })
                })
                setOpen({ k: "dbanner", plan: plan.id, row: id })
              },
            },
          ]}
        />
      )}

      {/* Quick Food Picker Sheet */}
      {open?.k === "food_picker" && (
        <QuickFoodPickerSheet
          isOpen={true}
          library={library}
          onClose={() => setOpen(null)}
          onPickFood={(foodText) => {
            data((pd) => {
              const p = findPlan(pd, open.plan)
              const m = p.rows.find((r) => r.id === open.mealId)
              if (m) {
                m.items.push({ text: foodText })
              }
            })
            toast.success("Food added")
          }}
        />
      )}

      {/* Generic Action Sheet */}
      {open?.k === "actions" && (
        <ActionSheet title={open.title} actions={open.actions} onClose={() => setOpen(null)} />
      )}

      {/* Header Sheet */}
      {open?.k === "header" && (
        <HeaderSheet
          header={d.header}
          onClose={() => setOpen(null)}
          onSave={(h) =>
            data((pd) => {
              pd.header = h
            })
          }
        />
      )}

      {/* Send Sheet */}
      {open?.k === "send" && (
        <SendSheet
          doc={doc}
          client={client}
          onClose={() => setOpen(null)}
          onSent={(sent) => {
            setDoc(sent)
            onLibraryChange()
            saveDoc(doc.id, { data: { ...sent.data, buildSeconds: buildSec.current } }).catch(() => {})
            toast(`Plan made in ${Math.max(1, Math.round(buildSec.current / 60))} min`, { icon: "⏱️" })
          }}
        />
      )}
    </div>
  )
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 min-h-[44px] px-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 cursor-pointer transition-colors ${
        on
          ? "bg-accent-orange/15 border-accent-orange/50 text-accent-orange"
          : "bg-white/5 border-border-subtle text-text-muted hover:text-white"
      }`}
    >
      <span
        className={`size-3.5 rounded-full border-2 ${
          on ? "bg-accent-orange border-accent-orange" : "border-text-muted"
        }`}
      />{" "}
      {label}
    </button>
  )
}

function More({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="More options"
      className="w-12 min-h-[48px] shrink-0 grid place-items-center text-text-muted cursor-pointer hover:text-white active:bg-white/5"
    >
      <MoreHorizontal className="size-5" />
    </button>
  )
}

function AddBtn({
  label,
  onClick,
  primary,
}: {
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 min-h-[48px] rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
        primary
          ? "bg-accent-orange/15 text-accent-orange border border-accent-orange/40"
          : "bg-white/5 hover:bg-white/10"
      }`}
    >
      <Plus className="size-4" /> {label}
    </button>
  )
}
