'use client'

import { useId, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

type SearchSelectProps = { label: string; value: string; options: readonly string[]; placeholder: string; disabled?: boolean; error?: string; id?: string; autoComplete?: string; accent?: 'orange' | 'emerald'; onChange: (value: string) => void }

export function SearchSelect({ label, value, options, placeholder, disabled = false, error, id, autoComplete, accent = 'orange', onChange }: SearchSelectProps) {
  const generatedId = useId()
  const buttonId = id ?? generatedId
  const errorId = `${buttonId}-error`
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = options.filter((option) => option.toLowerCase().includes(search.trim().toLowerCase()))
  const focusClasses = accent === 'emerald' ? 'focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100' : 'focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-orange-100'
  const activeClasses = accent === 'emerald' ? 'bg-emerald-50 font-black text-emerald-700' : 'bg-orange-50 font-black text-orange-700'

  return <div className="relative min-w-0">
    <span id={`${buttonId}-label`} className="text-xs font-black text-slate-800">{label}</span>
    <button id={buttonId} type="button" role="combobox" aria-controls={`${buttonId}-listbox`} disabled={disabled} aria-labelledby={`${buttonId}-label`} aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} ar¶»§q«^