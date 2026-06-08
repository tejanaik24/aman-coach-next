"use client"

import { useEffect } from "react"
import { initStore } from "@/lib/store"

export function StoreInitializer() {
  useEffect(() => { initStore() }, [])
  return null
}
