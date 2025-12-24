# Clerk Dashboard Setup Guide

## Step 1: Create a Clerk Account and Application

1. **Visit Clerk Dashboard**
   - Go to [https://dashboard.clerk.com/](https://dashboard.clerk.com/)
   - Sign up for a free account or sign in if you already have one

2. **Create a New Application**
   - Click "Add application" or "Create application"
   - Enter your application name: **"CareConnect"**
   - Choose your authentication options:
     - ✅ Email address
     - ✅ Google (recommended for easier testing)
     - ✅ Phone number (optional but recommended for healthcare)
   - Click "Create application"

## Step 2: Get Your API Keys

1. **Navigate to API Keys**
   - In your Clerk dashboard, go to "Configure" → "API Keys"
   - You'll see two important keys:
     - **Publishable key** (starts with `pk_test_` or `pk_live_`)
     - **Secret key** (starts with `sk_test_` or `sk_live_`)

2. **Copy the Keys**
   - Copy both keys - you'll need them in the next step

## Step 3: Configure Environment Variables

1. **Create the Environment File**
   - In your project root (`c:\Users\deven\Videos\test\`), create a file named `.env.local`
   - Copy the contents from `.env.local.example` and replace the placeholder values:

```env
# Clerk API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here

# Clerk URLs (these will be set automatically based on your domain)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/role-select
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/role-select
```

2. **Replace the Placeholder Values**
   - Replace `pk_test_your_actual_publishable_key_here` with your actual publishable key
   - Replace `sk_test_your_actual_secret_key_here` with your actual secret key

## Step 4: Configure Clerk Application Settings

1. **Set up Redirect URLs**
   - In Clerk Dashboard, go to "Configure" → "Paths"
   - Set the following paths:
     - **Sign-in URL**: `/auth`
     - **Sign-up URL**: `/auth`
     - **After sign-in URL**: `/role-select`
     - **After sign-up URL**: `/role-select`

2. **Configure Allowed Redirect URLs**
   - Go to "Configure" → "Domains"
   - Add your development URL: `http://localhost:3000`
   - Add any production URLs you plan to use

3. **Configure Social Providers (Optional but Recommended)**
   - Go to "Configure" → "SSO Connections"
   - Enable Google OAuth:
     - Click "Add connection" → "Google"
     - You can use Clerk's development keys for testing
     - For production, you'll need to set up your own Google OAuth credentials

## Step 5: Test the Integration

1. **Start Your Development Server**
   ```bash
   pnpm dev
   ```

2. **Test the Authentication Flow**
   - Visit `http://localhost:3000/auth`
   - Try signing up with a new account
   - Try signing in with Google (if enabled)
   - After successful authentication, you should be redirected to `/role-select`
   - Select a role and verify you're redirected to the correct dashboard

3. **Test Role-Based Access**
   - Try accessing different dashboard URLs directly:
     - `http://localhost:3000/patient/dashboard`
     - `http://localhost:3000/doctor/dashboard`
     - `http://localhost:3000/police/dashboard`
   - Verify that you can only access the dashboard that matches your selected role

## Step 6: Verify Webhook Setup (Optional for Advanced Features)

1. **Configure Webhooks (For Production)**
   - Go to "Configure" → "Webhooks"
   - Add endpoint: `https://yourdomain.com/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `session.created`

## Step 7: Production Deployment

1. **Update Environment Variables for Production**
   - Get production API keys from Clerk Dashboard
   - Update your production environment variables
   - Configure production domain in Clerk Dashboard

2. **Security Considerations**
   - Ensure your secret key is never exposed in client-side code
   - Use environment variables for all sensitive data
   - Set up proper CORS and domain restrictions

## Troubleshooting Common Issues

### Issue 1: "404 Not Found" on SSO Callback
- **Solution**: The `/auth/sso-callback` page has been created automatically
- Restart your development server if needed

### Issue 2: "public_metadata is not a valid parameter"
- **Solution**: This has been fixed by using a server-side API route
- The role update now happens through `/api/user/role`

### Issue 3: Redirect loops or infinite redirects
- **Solution**: Check your middleware configuration and ensure:
  - Protected routes are properly defined
  - Redirect URLs match your Clerk dashboard configuration

### Issue 4: Role not persisting after selection
- **Solution**: 
  - Check that the `/api/user/role` endpoint is working
  - Verify your secret key is correctly set
  - Check browser console for any errors

## Features Implemented

✅ **Authentication Entry Point**: `/auth` page with Clerk login UI
✅ **Role Selection**: `/role-select` page after successful login
✅ **Role-Based Routing**: Automatic redirection based on user role
✅ **Protected Routes**: Middleware protection for all dashboards
✅ **SSO Support**: Google authentication enabled
✅ **Role Persistence**: Server-side role storage in user metadata
✅ **Error Handling**: Proper error messages and loading states

## Next Steps

1. **Customize User Profiles**: Add additional fields in Clerk dashboard
2. **Set up Production Environment**: Deploy to your hosting platform
3. **Configure Additional Providers**: Add more social login options
4. **Implement Role Permissions**: Fine-tune access control within each role
5. **Add User Management**: Admin panel for managing user roles

Your Clerk integration is now complete and ready for testing!
