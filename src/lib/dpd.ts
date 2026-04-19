// DPD UK Web Services API
// Docs: https://developer.dpd.co.uk
// You need a DPD business account and they give you API credentials

const DPD_API_BASE = 'https://api.dpd.co.uk'

type DpdAuth = {
  accessToken: string
  expiresAt:   number  // unix timestamp
}

// Simple token cache — tokens last 1 hour
let tokenCache: DpdAuth | null = null

async function getDpdToken(): Promise<string> {
  // Reuse token if still valid (with 60s buffer)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken
  }

  const res = await fetch(`${DPD_API_BASE}/user/?action=login`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
    body: JSON.stringify({
      userId:   process.env.DPD_API_KEY,
      password: process.env.DPD_API_PASSWORD,
    }),
  })

  if (!res.ok) throw new Error(`DPD auth failed: ${res.status}`)

  const data = await res.json()

  tokenCache = {
    accessToken: data.data?.geoSession,
    expiresAt:   Date.now() + 60 * 60 * 1000,  // 1 hour
  }

  return tokenCache.accessToken
}

export type DpdShipmentParams = {
  customerName:   string
  addressLine1:   string
  addressLine2?:  string
  city:           string
  postcode:       string
  phone?:         string
  email?:         string
  referenceNumber:string  // your repair order number
  parcelWeight:   number  // kg — scooters are heavy, be accurate
}

export type DpdShipmentResult = {
  shipmentId:    string
  trackingNumber:string
  labelPdf:      string   // base64 encoded PDF
}

export async function createDpdShipment(params: DpdShipmentParams): Promise<DpdShipmentResult> {
  const token = await getDpdToken()

  const payload = {
    jobId: null,
    collectionOnDelivery: false,
    invoice: null,
    collectionDate: new Date().toISOString().split('T')[0],
    consolidate: false,
    consignment: [{
      consignmentNumber: null,
      consignmentRef: params.referenceNumber,
      parcels: [{
        yourReference:    params.referenceNumber,
        weight:           params.parcelWeight,
        packageNumber:    1,
        packageCount:     1,
      }],
      collectionDetails: {
        // Your warehouse address — set these in env vars
        contactDetails: {
          contactName: process.env.DPD_SENDER_NAME,
        },
        address: {
          street:       process.env.DPD_SENDER_STREET,
          locality:     process.env.DPD_SENDER_CITY,
          town:         process.env.DPD_SENDER_CITY,
          postcode:     process.env.DPD_SENDER_POSTCODE,
          countryCode:  'GB',
        },
      },
      deliveryDetails: {
        contactDetails: {
          contactName: params.customerName,
          telephone:   params.phone,
        },
        notificationDetails: {
          email:  params.email,
          mobile: params.phone,
        },
        address: {
          street:      params.addressLine1,
          locality:    params.addressLine2 ?? '',
          town:        params.city,
          postcode:    params.postcode,
          countryCode: 'GB',
        },
      },
      networkCode: 'D',  // DPD Next Day — change based on your DPD account service
      numberOfParcels: 1,
      totalWeight: params.parcelWeight,
      shippingRef1: params.referenceNumber,
    }],
  }

  const res = await fetch(`${DPD_API_BASE}/shipping/shipment`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'GeoClient':     `account/${process.env.DPD_ACCOUNT_NUMBER}`,
      'GeoSession':    token,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`DPD shipment creation failed: ${res.status} — ${errBody}`)
  }

  const data = await res.json()
  const consignment = data.data?.consignment?.[0]

  if (!consignment) throw new Error('DPD returned no consignment data')

  // Fetch the label PDF
  const shipmentId    = consignment.consignmentNumber
  const trackingNumber = consignment.parcel?.[0]?.parcelNumber

  const labelRes = await fetch(
    `${DPD_API_BASE}/shipping/label/${shipmentId}?format=PDF`,
    {
      headers: {
        'GeoClient':  `account/${process.env.DPD_ACCOUNT_NUMBER}`,
        'GeoSession': token,
        'Accept':     'application/json',
      },
    }
  )

  if (!labelRes.ok) throw new Error(`DPD label fetch failed: ${labelRes.status}`)

  const labelData = await labelRes.json()

  return {
    shipmentId:    String(shipmentId),
    trackingNumber:String(trackingNumber),
    labelPdf:      labelData.data?.label,  // base64 PDF
  }
}