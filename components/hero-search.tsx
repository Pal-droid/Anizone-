export function HeroSearch() {
  return (
    <form action="/search" method="GET" className="flex flex-wrap gap-2 items-stretch">
      <input
        name="keyword"
        placeholder="Es. naruto"
        className="flex-1 min-w-0 rounded-md border border-neutral-700 bg-neutral-900 placeholder:text-neutral-500 px-3 py-2 text-sm"
        aria-label="Parola chiave"
      />
      <select
        name="dub"
        className="rounded-md border border-neutral-700 bg-neutral-900 text-sm px-2 h-[36px] w-[140px] shrink-0"
        aria-label="Doppiaggio"
        defaultValue=""
      >
        <option value="">Tutti</option>
        <option value="0">Sub ITA</option>
        <option value="1">Doppiato ITA</option>
      </select>
      <button
        type="submit"
        className="rounded-md bg-white text-black text-sm font-medium px-4 h-[36px] shrink-0 whitespace-nowrap"
        aria-label="Cerca"
      >
        Cerca
      </button>
    </form>
  )
}

export default HeroSearch
