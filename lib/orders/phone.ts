const BANGLADESH_MOBILE = /^\+8801[3-9]\d{8}$/

/** Normalize common Bangladesh mobile formats to the existing stored +880 canonical form. */
export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('8801')) return `+${digits}`
  if (digits.startsWith('01')) return `+88${digits}`
  return phone.trim()
}

export function isValidBangladeshMobile(phone: string) {
  return BANGLADESH_MOBILE.test(normalizePhone(phone))
}
