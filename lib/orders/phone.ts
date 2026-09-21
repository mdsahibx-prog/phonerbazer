const BANGLADESH_MOBILE = /^01[3-9]\d{8}$/

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, '')
}

/** Normalize common Bangladesh mobile formats to the canonical local 11-digit form. */
export function normalizePhone(phone: string) {
  const digits = digitsOnly(phone)
  if (digits.startsWith('8801')) return `0${digits.slice(3)}`
  if (digits.startsWith('01')) return digits
  return phone.trim()
}

export function isValidBangladeshMobile(phone: string) {
  return BANGLADESH_MOBILE.test(normalizePhone(phone))
}
