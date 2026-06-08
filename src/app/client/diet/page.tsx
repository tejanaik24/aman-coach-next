"use client"

import { ClientLayout } from "@/components/layout/ClientLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useClientData } from "@/hooks/useClient"

export default function DietPage() {
  const { dietPlan, loading } = useClientData()

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  return (
    <ClientLayout>
      <h1 className="font-heading text-3xl text-white mb-6">DIET PLAN</h1>
      {dietPlan ? (
        <div className="space-y-4">
          <Card>
            <CardTitle className="text-lg">{dietPlan.name}</CardTitle>
            <CardContent>
              {dietPlan.description && (
                <p className="text-sm text-white/50 mb-2">{dietPlan.description}</p>
              )}
              {dietPlan.calories && (
                <p className="text-sm text-gold">
                  Daily Target: {dietPlan.calories} kcal
                </p>
              )}
            </CardContent>
          </Card>
          {dietPlan.meals.map((meal, i) => (
            <Card key={i}>
              <CardTitle className="text-base text-gold">
                {meal.name}
                {meal.time && <span className="ml-2 text-xs text-white/40">({meal.time})</span>}
              </CardTitle>
              <CardContent>
                <div className="space-y-1.5">
                  {meal.foods.map((food, j) => (
                    <div key={j} className="flex items-center justify-between text-sm">
                      <span className="text-white/70">{food.name}</span>
                      <span className="text-xs text-white/40">{food.portion}</span>
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
              No diet plan assigned yet. Your coach will assign one soon.
            </p>
          </CardContent>
        </Card>
      )}
    </ClientLayout>
  )
}
