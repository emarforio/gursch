type Props = { name: string; avatar?: string; size?: number }

export function Avatar({ name, avatar, size = 40 }: Props) {
  const style = { width: size, height: size, fontSize: size * 0.42 }
  if (avatar) {
    return <img src={avatar} alt="" style={style} className="shrink-0 rounded-full object-cover" />
  }
  return (
    <span
      style={style}
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-sunken font-semibold text-muted"
    >
      {name.trim().slice(0, 1).toUpperCase() || '?'}
    </span>
  )
}
