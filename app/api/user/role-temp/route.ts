import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json()
    
    if (!role || !['patient', 'doctor', 'police'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // For now, just return success - we'll store in localStorage on frontend
    // This is a temporary solution until Clerk keys are configured
    return NextResponse.json({ 
      success: true, 
      role: role,
      message: 'Role stored temporarily (configure Clerk keys for persistence)',
      temporary: true
    })
    
  } catch (error) {
    console.error('Error in temporary role update:', error)
    return NextResponse.json(
      { error: 'Failed to update role', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}
