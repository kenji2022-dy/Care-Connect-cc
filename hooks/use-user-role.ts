"use client"
import { useUser } from '@clerk/nextjs'

export function useUserRole() {
  const { user, isLoaded } = useUser()
  
  const role = user?.publicMetadata?.role as string | undefined
  
  const hasRole = (requiredRole: string) => {
    return role === requiredRole
  }
  
  const hasAnyRole = (requiredRoles: string[]) => {
    return role ? requiredRoles.includes(role) : false
  }
  
  const isPatient = () => hasRole('patient')
  const isDoctor = () => hasRole('doctor')
  const isPolice = () => hasRole('police')
  
  return {
    role,
    hasRole,
    hasAnyRole,
    isPatient,
    isDoctor,
    isPolice,
    isLoaded,
    user
  }
}
