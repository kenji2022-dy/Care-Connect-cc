import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export default clerkMiddleware(async (auth, req) => {
  // Get user session information
  const { userId, sessionId } = await auth()
  const url = req.nextUrl.pathname
  
  // Public/bypass paths that do NOT require an authenticated session.
  // This allows navigating directly to dashboards from the role-select flow
  // without being redirected back when there is no Clerk session.
  const publicPrefixes = [
    '/',
    '/role-select',
    '/patient/dashboard',
    '/doctor/dashboard',
    '/police/dashboard',
    '/_next'
  ]

  const isStatic = url.match(/\.(?:html?|css|js(?!on)|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)$/)

  // Skip protection for static files and any public paths listed above
  if (isStatic || publicPrefixes.some(prefix => url === prefix || url.startsWith(prefix))) {
    return NextResponse.next()
  }
  
  // Explicit session checking
  if (!userId || !sessionId) {
  // No valid session - redirect to role-select (entry point)
  console.log(`No session found for ${url}, redirecting to /role-select`)
  return NextResponse.redirect(new URL('/role-select', req.url))
  }
  
  console.log(`Valid session found: userId=${userId}, sessionId=${sessionId?.slice(0, 10)}...`)
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
      '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
