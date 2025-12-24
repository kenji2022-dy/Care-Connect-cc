import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role } = await request.json()
    
    if (!role || !['patient', 'doctor', 'police'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get the Clerk client instance
    const client = await clerkClient()
    
    // Update user metadata with role using Clerk client
    await client.users.updateUser(userId, {
      publicMetadata: {
        role: role
      }
    })

    return NextResponse.json({ 
      success: true, 
      role: role,
      message: 'Role updated successfully' 
    })
    
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Failed to update role' }, 
      { status: 500 }
    )
  }
}
