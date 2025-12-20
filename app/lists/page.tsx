import { Suspense } from "react"
import { ListsClient } from "@/components/lists-client"

export default function ListsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">Caricamento...</div>}>
      <ListsClient />
    </Suspense>
  )
}
