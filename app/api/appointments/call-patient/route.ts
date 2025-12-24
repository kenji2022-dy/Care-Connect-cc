import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      phoneNumber = '+918019227239',
      patientName = 'Devendra'
    } = body

    if (!phoneNumber || !patientName) {
      return NextResponse.json(
        { error: 'Phone number and patient name are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.RINGG_API_KEY2
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      )
    }

    const payload = {
      name: patientName,
      mobile_number: phoneNumber,
      agent_id: '8a206e82-4dca-4ea3-b5e4-082208a57c0f', 
      from_number: '+918035736726',
    }

    const res = await fetch('https://prod-api.ringg.ai/ca/api/v0/calling/outbound/individual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message || 'Call initiation failed' }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Voice call API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
