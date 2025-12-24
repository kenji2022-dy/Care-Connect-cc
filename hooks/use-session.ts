"use client"
import { useAuth, useUser } from '@clerk/nextjs'

/**
 * Custom hook to check user session and authentication status
 * Provides detailed session information and helper methods
 */
export function useSession() {
  const { userId, sessionId, isLoaded: authLoaded, isSignedIn } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  
  // Check if session is valid
  const hasValidSession = !!(userId && sessionId && isSignedIn)
  
  // Check if session is expired or missing
  const isSessionExpired = authLoaded && !hasValidSession
  
  // Get user role from metadata or localStorage fallback
  const userRole = user?.publicMetadata?.role as string || 
                   (typeof window !== 'undefined' ? localStorage.getItem('userRole') : null)
  
  // Check if user has completed role selection
  const hasSelectedRole = !!userRole
  
  // Overall loading state
  const isLoading = !authLoaded || !userLoaded
  
  // Session info for debugging
  const sessionInfo = {
    userId: userId || 'Not available',
    sessionId: sessionId ? `${sessionId.slice(0, 10)}...` : 'Not available',
    isSignedIn,
    userRole,
    hasSelectedRole,
    email: user?.emailAddresses?.[0]?.emailAddress,
    firstName: user?.firstName,
    lastName: user?.lastName,
    createdAt: user?.createdAt,
    lastSignInAt: user?.lastSignInAt
  }
  
  return {
    // Authentication state
    hasValidSession,
    isSessionExpired,
    isSignedIn,
    isLoading,
    
    // User data
    user,
    userId,
    sessionId,
    userRole,
    hasSelectedRole,
    
    // Helper methods
    getSessionInfo: () => sessionInfo,
    
    // Debug method
    logSessionInfo: () => {
      console.group('🔐 Session Information')
      console.table(sessionInfo)
      console.groupEnd()
    }
  }
}
