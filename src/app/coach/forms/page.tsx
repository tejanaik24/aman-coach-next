"use client"

import { useState, useEffect } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { getCoachOnboardingForms, getCoachClients } from "@/lib/store"
import { useAuth } from "@/hooks/useAuth"
import { motion, AnimatePresence } from "motion/react"
import { format } from "date-fns"
import { ClipboardList, Baby, ChevronDown, ChevronUp, CheckCircle, Clock } from "lucide-react"

type FormEntry = {
  user_id: string
  data: Record<string, unknown>
  status: string
  form_type: string
  submitted_at: string
}

type ClientInfo = {
  uid: string
  displayName: string
  email: string
}

function FormSection({ title, fields }: { title: string; fields: { label: string; value: unknown }[] }) {
  const nonEmpty = fields.filter(f => f.value && String(f.value).trim() !== "")
  if (nonEmpty.length === 0) return null
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[#FFB800] mb-3">{title}</p>
      <div className="space-y-2">
        {nonEmpty.map((f, i) => (
          <div key={i} className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5">
            <p className="text-xs text-zinc-500 mb-0.5">{f.label}</p>
            <p className="text-sm text-white whitespace-pre-wrap">{String(f.value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PhotoGrid({ data }: { data: Record<string, unknown> }) {
  const photos = [
    { key: "photoFront", label: "Front" },
    { key: "photoBack", label: "Back" },
    { key: "photoLeft", label: "Left Side" },
    { key: "photoRight", label: "Right Side" },
    { key: "photoFavPose", label: "Fav Pose" },
    { key: "photoMandatoryPose", label: "Mandatory" },
    { key: "photoPreConception", label: "Pre-Conception" },
  ].filter(p => data[p.key])

  if (photos.length === 0) return null

  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[#FFB800] mb-3">Progress Photos</p>
      <div className="grid grid-cols-3 gap-2">
        {photos.map(p => (
          <div key={p.key} className="space-y-1">
            <p className="text-xs text-zinc-500 text-center">{p.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data[p.key] as string}
              alt={p.label}
              className="w-full aspect-[3/4] object-cover rounded-xl border border-zinc-800"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function FormCard({ entry, clientName, clientEmail }: {
  entry: FormEntry; clientName: string; clientEmail: string
}) {
  const [expanded, setExpanded] = useState(false)
  const d = entry.data
  const isAntenatal = entry.form_type === "antenatal"

  return (
    <motion.div
      layout
      className="rounded-2xl border border-zinc-800 bg-[#111111] overflow-hidden"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-xl flex items-center justify-center ${
            isAntenatal ? "bg-pink-500/20" : "bg-[#FFB800]/20"
          }`}>
            {isAntenatal ? <Baby className="size-5 text-pink-400" /> : <ClipboardList className="size-5 text-[#FFB800]" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{clientName}</p>
            <p className="text-xs text-zinc-500">{clientEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-1">
            <p className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isAntenatal ? "bg-pink-500/20 text-pink-400" : "bg-[#FFB800]/20 text-[#FFB800]"
            }`}>
              {isAntenatal ? "Antenatal" : "Standard"}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {entry.submitted_at ? format(new Date(entry.submitted_at), "d MMM yyyy") : "—"}
            </p>
          </div>
          {expanded ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
        </div>
      </button>

      {/* Full Form Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-800 p-4">

              {/* Contact */}
              <FormSection title="Contact Information" fields={[
                { label: "Full Name", value: d.fullName },
                { label: "Email", value: d.email },
                { label: "Contact Number", value: d.contactNumber },
                { label: "Address", value: d.address },
                { label: "Alternate Contact", value: d.altContact },
                { label: "Based Overseas?", value: d.isOverseas },
              ]} />

              {/* General / Pregnancy */}
              {isAntenatal ? (
                <FormSection title="Pregnancy Details" fields={[
                  { label: "Gestational Age", value: d.gestationalAge },
                  { label: "LMP Date", value: d.lmp },
                  { label: "EDD", value: d.edd },
                  { label: "Gravidity", value: d.gravidity },
                  { label: "Pregnancy Type", value: d.pregnancyType },
                  { label: "Wake Time", value: d.wakeTime },
                  { label: "Sleep Time", value: d.sleepTime },
                ]} />
              ) : (
                <FormSection title="General Information" fields={[
                  { label: "Date of Birth", value: d.dob },
                  { label: "Height", value: d.height ? `${d.height} ${d.heightUnit}` : "" },
                  { label: "Gender", value: d.gender },
                  { label: "Goal", value: d.goal },
                  { label: "Wake Time", value: d.wakeTime },
                  { label: "Sleep Time", value: d.sleepTime },
                  { label: "Hired Coach Before?", value: d.hiredCoachBefore },
                  { label: "Home Equipment?", value: d.hasHomeEquipment },
                  { label: "Equipment Details", value: d.equipmentDetails },
                ]} />
              )}

              {/* Training */}
              {!isAntenatal && (
                <FormSection title="Lifestyle & Training" fields={[
                  { label: "Working Status", value: d.isWorking },
                  { label: "Work Hours & Timings", value: d.workHoursTimings },
                  { label: "Exercises Currently?", value: d.exercisesCurrently },
                  { label: "Activity Type", value: d.activityType },
                  { label: "Working Out Since", value: d.workingOutSince },
                  { label: "Current Workout Routine", value: d.workoutRoutine },
                  { label: "Daily Steps", value: d.dailySteps },
                  { label: "Cardio Frequency & Type", value: d.cardioFrequency },
                  { label: "Preferred Workout Time", value: d.preferWorkoutTime },
                  { label: "Tentative Workout Time", value: d.tentativeWorkoutTime },
                  { label: "Days Per Week", value: d.daysPerWeek },
                ]} />
              )}

              {/* Health */}
              <FormSection title="Health History" fields={[
                { label: "Injury / Pain / Stiffness", value: d.injuryPainStiffness || d.injuryPainMobility },
                { label: "Injury / Surgery History", value: d.injurySurgeryHistory || d.surgicalHistory },
                { label: "Health Issues / Disorders", value: d.healthIssues },
                { label: "Family History (Diabetes/Thyroid/BP)", value: d.familyHistory },
                { label: "Palpitations / Dizziness", value: d.palpitationDizziness },
                { label: "Prescribed Medications", value: d.prescribedMeds },
                { label: "Constipation History", value: d.constipationHistory || d.constipationFrequency },
                { label: "Pooping Frequency", value: d.poopingFrequency },
                { label: "Drug / Alcohol / Smoke", value: d.drugAlcoholSmoke || d.alcoholSmokeDrugs },
                { label: "Average Urine Colour", value: d.urineColor },
                { label: "Menstrual Duration", value: d.menstrualDuration },
                { label: "Menstrual Cycle Frequency", value: d.menstrualCycleFreq },
                { label: "Blood Loss Amount", value: d.menstrualBloodLoss },
                { label: "Days 1–4 Condition", value: d.menstrualDays14 },
                { label: "Steroids / SARMS / Peptides History", value: d.steroidsSarmsHistory },
              ]} />

              {/* Nutrition */}
              <FormSection title="Nutritional Information" fields={[
                { label: "Diet Type", value: d.dietType },
                { label: "Non-veg Restricted Days", value: d.nonVegRestrictedDays },
                { label: "Lactose Intolerant?", value: d.lactoseIntolerant },
                { label: "Whey Protein OK?", value: d.wheyProtein },
                { label: "Food Allergies", value: d.foodAllergies },
                { label: "Foods Causing Nausea", value: d.nauseasFoods },
                { label: "Breakfast Time", value: d.breakfastTime },
                { label: "Lunch Time", value: d.lunchTime },
                { label: "Dinner Time", value: d.dinnerTime },
                { label: "Max Meals Per Day", value: d.maxMealsPerDay },
                { label: "Pre-Workout Meal?", value: d.preWorkoutMeal },
                { label: "Current Supplements", value: d.currentSupplements },
                { label: "Morning Diet", value: d.currentDietMorning },
                { label: "Breakfast", value: d.currentDietBreakfast },
                { label: "Mid-Day", value: d.currentDietMidDay },
                { label: "Lunch", value: d.currentDietLunch },
                { label: "Evening", value: d.currentDietEvening },
                { label: "Dinner", value: d.currentDietDinner },
                { label: "Daily Water Intake", value: d.waterIntake },
                { label: "Favourite Foods", value: d.favoriteFoods },
                { label: "Disliked Foods", value: d.dislikedFoods },
                { label: "Preferred Plan Foods", value: d.preferredPlanFoods },
                { label: "Seasonal Fruits", value: d.seasonalFruits },
                { label: "Savoury vs Sweet", value: d.savourySweet },
                { label: "Chocolate Preference", value: d.chocolatePref },
                { label: "Favourite Cheat Meal", value: d.favoriteCheatMeal },
                { label: "Grocery Store Links", value: d.groceryStoreLinks },
                { label: "Supplement Store Links", value: d.supplementStoreLinks },
              ]} />

              {/* Blood Pressure */}
              <FormSection title="Blood Pressure" fields={[
                { label: "Morning BP", value: d.morningBpSystolic ? `${d.morningBpSystolic}/${d.morningBpDiastolic} mmHg` : "" },
                { label: "Afternoon BP", value: d.afternoonBpSystolic ? `${d.afternoonBpSystolic}/${d.afternoonBpDiastolic} mmHg` : "" },
                { label: "Evening BP", value: d.eveningBpSystolic ? `${d.eveningBpSystolic}/${d.eveningBpDiastolic} mmHg` : "" },
              ]} />

              {/* Blood Glucose (antenatal) */}
              {isAntenatal && (
                <FormSection title="Blood Glucose Monitoring" fields={[
                  { label: "Fasting Glucose", value: d.fastingGlucose ? `${d.fastingGlucose} mg/dL` : "" },
                  { label: "Post-Breakfast (90–120 min)", value: d.postBreakfastGlucose ? `${d.postBreakfastGlucose} mg/dL` : "" },
                  { label: "Post-Lunch (90–120 min)", value: d.postLunchGlucose ? `${d.postLunchGlucose} mg/dL` : "" },
                  { label: "Post-Dinner (90–120 min)", value: d.postDinnerGlucose ? `${d.postDinnerGlucose} mg/dL` : "" },
                  { label: "Resting Heart Rate", value: d.restingBpm ? `${d.restingBpm} bpm` : "" },
                ]} />
              )}

              {/* Measurements */}
              <FormSection title="Measurements" fields={[
                { label: "Weight", value: d.weight || d.presentWeight ? `${d.weight || d.presentWeight} kg` : "" },
                { label: "Neck", value: d.neck ? `${d.neck} cm` : "" },
                { label: "Abdomen (at navel)", value: d.abdomen ? `${d.abdomen} cm` : "" },
                { label: "Waist (pelvic bone)", value: d.waist ? `${d.waist} cm` : "" },
                { label: "Hips", value: d.hips ? `${d.hips} cm` : "" },
                { label: "Right Arm", value: d.rightArm ? `${d.rightArm} cm` : "" },
                { label: "Right Thigh", value: d.rightThigh ? `${d.rightThigh} cm` : "" },
                { label: "Right Calf", value: d.rightCalf ? `${d.rightCalf} cm` : "" },
                { label: "Lowest Weight (last 3–5 yrs)", value: d.lowestWeight ? `${d.lowestWeight} kg` : "" },
                { label: "Lowest Weight Period", value: d.lowestWeightPeriod },
                { label: "Heaviest Weight", value: (d.heaviestWeight || d.heaviestWeightPeriod) ? `${d.heaviestWeight} kg` : "" },
                { label: "Weight Before Conceiving", value: d.weightBeforeConceiving ? `${d.weightBeforeConceiving} kg` : "" },
                { label: "Weight at Start of 1st Trimester", value: d.weightStart1stTrimester ? `${d.weightStart1stTrimester} kg` : "" },
                { label: "Weight at End of 1st Trimester", value: d.weightEnd1stTrimester ? `${d.weightEnd1stTrimester} kg` : "" },
              ]} />

              {/* Photos */}
              <PhotoGrid data={d} />

              {/* Additional Info */}
              <FormSection title="Additional Notes" fields={[
                { label: "Additional Information", value: d.additionalInfo },
                { label: "Home Equipment Details", value: d.homeEquipmentDetails },
              ]} />

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoachFormsPage() {
  const { user } = useAuth()
  const [forms, setForms] = useState<FormEntry[]>([])
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      getCoachOnboardingForms(user.id),
      getCoachClients(user.id),
    ]).then(([formsData, clientsData]) => {
      setForms(formsData)
      setClients(clientsData.map(c => ({ uid: c.uid, displayName: c.displayName, email: c.email })))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user?.id])

  const getClient = (userId: string) =>
    clients.find(c => c.uid === userId) || { displayName: "Unknown Client", email: userId }

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  return (
    <CoachLayout>
      <div className="flex items-center gap-3 mb-2">
        <ClipboardList className="size-6 text-[#FFB800]" />
        <h1 className="font-heading text-2xl text-white">CLIENT INTAKE FORMS</h1>
      </div>
      <p className="text-xs text-zinc-500 mb-6">Submitted onboarding questionnaires from your clients</p>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 rounded-xl bg-[#111111] border border-zinc-800 p-3 flex items-center gap-3">
          <CheckCircle className="size-5 text-green-400" />
          <div>
            <p className="text-lg font-bold text-white">{forms.length}</p>
            <p className="text-xs text-zinc-500">Forms submitted</p>
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-[#111111] border border-zinc-800 p-3 flex items-center gap-3">
          <Clock className="size-5 text-[#FFB800]" />
          <div>
            <p className="text-lg font-bold text-white">
              {forms.filter(f => f.form_type === "antenatal").length}
            </p>
            <p className="text-xs text-zinc-500">Antenatal forms</p>
          </div>
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm font-medium text-zinc-400">No forms submitted yet</p>
          <p className="text-xs text-zinc-600 mt-1">When clients complete their intake form, it&apos;ll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map(entry => {
            const client = getClient(entry.user_id)
            return (
              <FormCard
                key={entry.user_id}
                entry={entry}
                clientName={client.displayName}
                clientEmail={client.email}
              />
            )
          })}
        </div>
      )}
    </CoachLayout>
  )
}
