import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'plain' | 'quiet' | 'danger'
  size?: 'md' | 'sm'
}

const variants = {
  primary: 'bg-accent text-accent-text',
  plain: 'bg-sunken text-text',
  quiet: 'text-muted',
  danger: 'text-bad',
}

export function Button({ variant = 'plain', size = 'md', className = '', type = 'button', ...rest }: Props) {
  const pad = size === 'md' ? 'h-11 px-4 text-base' : 'h-9 px-3 text-sm'
  return (
    <button
      type={type}
      className={`rounded-lg font-medium disabled:opacity-40 ${pad} ${variants[variant]} ${className}`}
      {...rest}
    />
  )
}
