import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ 
      success: true, 
      userId: userId,
      hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      message: 'Auth working correctly' 
    })
    
  } catch (error) {
    console.error('Error in auth test:', error)
    return NextResponse.json(
      { error: 'Auth test failed', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}
