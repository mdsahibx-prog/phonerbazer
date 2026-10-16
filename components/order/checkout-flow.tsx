'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, CheckCircle2, LoaderCircle, PackageCheck, ShieldCheck } from 'lucide-react'
import Image from 'next/image'

import { createGuestOrderWithRisk, quoteGuestCodOrder } from '@/lib/orders/actions'
import { saveCheckoutRecoveryDraft } from '@/lib/commerce/checkout-recovery-actions'
import { isValidBangladeshMobile, normalizePhone } from '@/lib/orders/phone'
import { getAnalyticsConsent, trackClientEvent } from '@/lib/analytics/client'
import type { OrderSuccessSummary, Quote } from '@/lib/orders/schema'
import { formatPrice } from '@/lib/services/storefront-utils'
import { SearchSelect } from '@/components/order/search-select'
import { DIVISIONS, districtsForDivision } from '@/lib/orders/locations'

type FormState = {
  fullName: string
  phone: string
  division: string
  district: string
  area: string
  address: string
  quantity: number
}

const initialForm: FormState = { fullName: '', phone: '', division: '', district: '', area: '', address: '', quantity: 1 }

type Step = 'contact' | 'delivery' | 'review'


function Input({ label, value, onChange, onBlur, error, type = 'text', placeholder, autoComplete }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; error?: string; type?: string; placeholder: string; autoComplete?: string }) {
  return <label className="block min-w-0">
    <span className="text-xs font-black¶»§q«^