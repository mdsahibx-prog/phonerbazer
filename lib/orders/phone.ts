const BANGLADESH_MOBILE = /^01[3-9]\d{8}$/

/** Normalize common Bangladesh mobile formats to the canonical local 11-digit form. */
export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('8801')) return `0${digits.slice(2)}`
  if (digits.startsWith('01')) return digits
  return phone.trim()
}

export function isValidBangladeshMobile(phone: string) {
  return BANGLADESH_MOBILE.test(normalizePhone(phone))
}
