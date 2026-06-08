"use client"

import { ClientLayout } from "@/components/layout/ClientLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useClientData } from "@/hooks/useClient"

export default function WorkoutPage() {
  const { workoutPlan, loading } = useClientData()

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  return (
    <ClientLayout>
      <h1 className="font-heading text-3xl text-white mb-6">WORKOUT PLAN</h1>
      {workoutPlan ? (
        <div className="space-y-4">
          <Card>
            <CardTitle className="text-lg">{workoutPlan.name}</CardTitle>
            {workoutPlan.description && (
              <CardContent>
                <p className="text-sm text-white/50">{workoutPlan.description}</p>
              </CardContent>
            )}
          </Card>
          {workoutPlan.days.map((day, i) => (
            <Card key={i}>
              <CardTitle className="text-base text-gold">{day.day}</CardTitle>
              <CardContent>
                <div className="space-y-2">
                  {day.exercises.map((ex, j) => (
                    <div key={j} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{ex.name}</p>
                        <p className="text-xs text-white/40">
                          {ex.sets} × {ex.reps}
                          {ex.weight ? ` @ ${ex.weight}kg` : ""}
                          {ex.rest ? ` | Rest: ${ex.rest}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-white/40 text-center py-8">
              No workout plan assigned yet. Your coach will assign one soon.
            </p>
          </CardContent>
        </Card>
      )}
    </ClientLayout>
  )
}
