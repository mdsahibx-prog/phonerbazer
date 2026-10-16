import { z } from 'zod'
import { isValidBangladeshMobile, normalizePhone } from '@/lib/orders/phone'

const optionalText = z.string().trim().max(500).optional().or(z.literal(''))

export const orderSelectionSchema = z.object({
  productId: z.string().uuid('Please select a valid product.'),
  variantId: z.string().uuid('Please select a valid variant.'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').max(10, 'Maximum quantity is 10 per order.'),
})

export const customerDetailsSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(120, 'Name is too long.'),
  phone: z.string().trim().transform(normalizePhone).refine(isValidBangladeshMobile, 'Enter a valid Bangladeshi mobile number.'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')]).optional(),
})

export const deliveryDetailsSchema = z.object({
  division: z.string().trim().min(2, 'Select your division.').max(80),
  district: z.string().trim().min(2, 'Enter your district.').max(80),
  area: z.string().trim().min(2, 'Enter your area or upazila.').max(100),
  address: z.string().trim().min(8, 'Enter your full delivery address.').max(500),
  postalCode: optionalText,
  notes: optionalText,
})

export const guestOrderInputSchema = orderSelectionSchema
  .merge(customerDetailsSchema)
  .merge(deliveryDetailsSchema)
  .extend({ checkoutRequestId: z.string().uuid('Unable to verify this checkout request. Please try again.'), che¶»§q«^