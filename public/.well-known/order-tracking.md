# PhonerBazar Order Tracking

Read-only public customer order-status lookup capability.

## Purpose

Help a customer check an existing order using the same order number and checkout mobile number required by the public tracking workflow.

## Canonical interface

https://www.phonerbazar.store/track-order

## Safety boundary

- Read-only lookup only.
- No order creation, cancellation, payment, refund, address mutation, or account administration.
- Do not expose order information without the application's existing matching and server-side validation.
- Never request passwords, payment-card details, or other credentials.

## WebMCP

This document describes the public browser workflow advertised by the PhonerBazar ARD catalog. Agents should use the existing tracking form and preserve the application's server-side validation and privacy boundary.
