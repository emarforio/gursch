export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{note}</p>
    </section>
  )
}
