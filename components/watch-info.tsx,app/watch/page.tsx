import type { WatchInfoProps } from "./types" // Assuming types are defined elsewhere

const WatchInfo: React.FC<WatchInfoProps> = ({ seriesPath }) => {
  const meta = {
    title: "A very long title that should wrap if it exceeds the container width",
    jtitle: "A very long Japanese title that should also wrap if it exceeds the container width",
    // Other meta fields
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-4 min-w-0 overflow-x-hidden break-words">
        <div className="text-lg font-semibold break-words">{meta.title}</div>
        <div className="text-sm text-muted-foreground break-words">{meta.jtitle}</div>
        {/* Informazioni grid content here */}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground break-words">
        {/* Meta fields grid content here */}
      </div>
      <div className="w-full max-w-full min-w-0 overflow-x-auto no-scrollbar [&>*]:min-w-0">
        {/* Similar/related scrollers here */}
      </div>
    </div>
  )
}

export default WatchInfo

// app/watch/page.tsx
import type React from "react"
import EpisodePlayer from "../components/EpisodePlayer"
import WatchInfo from "../components/watch-info"

const WatchPage: React.FC = () => {
  const path = "/path/to/episode"
  const title = "Series Title"
  const seriesKey = "/path/to/series"

  return (
    <main className="min-h-screen overflow-x-hidden">
      <section className="px-4 py-4">
        <div className="mx-auto max-w-screen-lg w-full space-y-6 overflow-x-hidden min-w-0">
          <EpisodePlayer path={path} seriesTitle={title} />
          <WatchInfo seriesPath={seriesKey} />
        </div>
      </section>
    </main>
  )
}

export default WatchPage;
