const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonerbazar.store";
export const siteConfig = {
  name: "PhonerBazar",
  tagline: "সঠিক দাম, সঠিক গ্যাজেট",
  brandPromise: "আসল পণ্য • দ্রুত ডেলিভারি • সারা দেশে সেবা",
  url: SITE_URL,
  established: 2019,
  location: {
    address: "Narayanganj, Dhaka, Bangladesh",
    city: "Narayanganj",
    country: "Bangladesh",
  },
  contact: {
    phone: "+880 1874-002918",
    publicEmail: "phonerbazar.helpline@gmail.com",
    adminEmail: "phonerbazar.helpline@gmail.com",
    supportEmail: "phonerbazar.helpline@gmail.com",
    businessEmail: "phonerbazar.helpline@gmail.com",
    facebook: "https://www.facebook.com/profile.php?id=61576274226905",
  },
  email: {
    sender: "phonerbazar.helpline@gmail.com",
    replyTo: "phonerbazar.helpline@gmail.com",
  },
  delivery: {
    dhakaCharge: 80,
    outsideDhakaCharge: 130,
  },
  warranty: {
    guaranteeDays: 7,
    serviceWarrantyYears: 1,
    defaultPolicy: "7 Days Guarantee & 1 Year Service Warranty. Manufacturer warranty terms apply where applicable.",
  },
  currency: {
    code: "BDT",
    symbol: "৳",
  },
}

export type SiteConfig = typeof siteConfig
