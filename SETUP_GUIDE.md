# Installation & Setup Guide

Complete guide to installing and setting up the User Profile Settings and Rating System.

## 📋 Prerequisites

- Next.js 16+ project
- React 19+
- Tailwind CSS 4+
- TypeScript (recommended)

## 🚀 Installation Steps

### Step 1: Install Lucide React

```bash
npm install lucide-react
```

Or with yarn:
```bash
yarn add lucide-react
```

Or with pnpm:
```bash
pnpm add lucide-react
```

### Step 2: Copy Components

All components are located in `components/` directory:

```
components/
├── BottomSheet.tsx
├── StarRating.tsx
├── RatingModal.tsx
├── ProfileForm.tsx
├── SavedAddresses.tsx
└── SecuritySettings.tsx
```

These are already created and ready to use.

### Step 3: Copy Pages

Profile settings pages are located in:

```
app/
├── customer/
│   ├── settings/
│   │   └── page.tsx          # Main settings page
│   └── orders/
│       ├── page.tsx          # Orders list with rating
│       └── rate/
│           └── page.tsx      # Order rating page
```

### Step 4: Verify Type Definitions

Ensure `lib/types.d.ts` contains the necessary type definitions:

```typescript
export interface UserProfile { ... }
export interface SavedAddress { ... }
export interface RatingSubmission { ... }
```

Type definitions are already added.

### Step 5: Configure API Base URL

In your `.env.local` file:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Or for production:
```
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

### Step 6: Ensure localStorage Authentication

The components expect authentication tokens in localStorage:

```typescript
const token = localStorage.getItem('access_token');
```

If you store tokens differently, update `lib/api.ts`:

```typescript
// Example: with sessionStorage
const token = sessionStorage.getItem('auth_token');

// Example: with cookies
const token = document.cookie.split('access_token=')[1];
```

## ✅ Verification Checklist

- [ ] lucide-react is installed
- [ ] All components exist in `components/`
- [ ] All pages exist in `app/`
- [ ] `lib/types.d.ts` has type definitions
- [ ] `NEXT_PUBLIC_API_BASE_URL` is configured
- [ ] API routes respond correctly
- [ ] Authentication token is stored in localStorage
- [ ] Tailwind CSS is configured

## 🔗 Available Routes

After setup, these routes are available:

### Customer Routes
```
GET  /customer                    # Customer homepage
GET  /customer/settings           # Profile settings page
GET  /customer/orders             # Orders list
GET  /customer/orders/rate        # Order rating page (requires ?orderId=)
```

## 📝 Minimal Example

Minimal example to test the components:

```tsx
// app/test-components/page.tsx
"use client";

import { useState } from "react";
import RatingModal from "@/components/RatingModal";
import BottomSheet from "@/components/BottomSheet";
import StarRating from "@/components/StarRating";

export default function TestPage() {
  const [showRating, setShowRating] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [rating, setRating] = useState(0);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Test Components</h1>

      {/* Test Rating Modal */}
      <button
        onClick={() => setShowRating(true)}
        className="rounded-lg bg-blue-600 text-white px-4 py-2 font-bold"
      >
        Test Rating Modal
      </button>

      <RatingModal
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        orderId="test-order"
        onSubmit={async (data) => {
          console.log("Rating submitted:", data);
          alert("Check console for data");
        }}
      />

      {/* Test Bottom Sheet */}
      <button
        onClick={() => setShowSheet(true)}
        className="rounded-lg bg-green-600 text-white px-4 py-2 font-bold"
      >
        Test Bottom Sheet
      </button>

      <BottomSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        title="Test Sheet"
      >
        <p>This is test content for the bottom sheet</p>
      </BottomSheet>

      {/* Test Star Rating */}
      <div className="space-y-2">
        <p className="font-bold">Test Star Rating:</p>
        <StarRating
          rating={rating}
          onRatingChange={setRating}
          size="lg"
        />
        <p>Current rating: {rating}</p>
      </div>
    </div>
  );
}
```

Access it at: `http://localhost:3000/test-components`

## 🔌 API Endpoints Required

Your backend must implement these endpoints:

### Profile Endpoints
```
GET    /api/customers/profile
PATCH  /api/customers/profile
PATCH  /api/customers/profile/upload (multipart/form-data)
```

### Addresses Endpoints
```
GET    /api/customers/saved-addresses
POST   /api/customers/saved-addresses
PATCH  /api/customers/saved-addresses/{id}/default
DELETE /api/customers/saved-addresses/{id}
```

### Security Endpoints
```
POST  /api/customers/security/change-password
GET   /api/customers/security/devices
POST  /api/customers/security/devices/{id}/logout
```

### Orders Endpoints
```
GET   /api/customers/orders
GET   /api/customers/orders/{id}
POST  /api/customers/orders/{id}/rating
```

## 🔐 Security Setup

### Authentication

The system expects:
- Authentication token in `localStorage.access_token`
- Token sent as `Authorization: Bearer {token}`

### CSRF Protection (if needed)

Add to your API calls:
```typescript
headers: {
  'X-CSRF-Token': csrfToken,
  // ... other headers
}
```

### Content Security Policy

For image uploads, ensure your CSP allows:
```
img-src 'self' https://*.yourdomain.com data:;
```

## 🧪 Testing

### Test Profile Form
```
Navigate to: /customer/settings
Click "Basic Info" tab
Edit any field and click "Save Changes"
```

### Test Saved Addresses
```
Navigate to: /customer/settings
Click "Saved Addresses" tab
Click "Add New Address"
Fill in the form and submit
```

### Test Rating Modal
```
Navigate to: /customer/orders
Find a completed order without rating
Click "Rate"
Select stars and submit
```

### Test Security
```
Navigate to: /customer/settings
Click "Security" tab
Enter passwords to test validation
```

## 📊 Development Mode

For development without a backend, use mock data:

```tsx
// components/ProfileForm.tsx
if (process.env.NODE_ENV === 'development') {
  // Use mock profile
  const mockProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+66812345678',
    // ...
  };
}
```

## 🎯 Next Steps

1. **Test the components** using the test page
2. **Implement backend endpoints** following the API spec
3. **Connect your authentication** system
4. **Customize styles** as needed
5. **Add error handling** for your specific use cases
6. **Test with real data** from your API

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Hooks Guide](https://react.dev/reference/react/hooks)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide React Icons](https://lucide.dev/)

## 🐛 Troubleshooting

### Icons not showing
- Check lucide-react is installed: `npm list lucide-react`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Styles not applying
- Ensure Tailwind CSS is configured in `tailwind.config.ts`
- Check `PostCSS` configuration
- Run `npm run build` to verify

### API calls failing
- Check API base URL in `.env.local`
- Verify authentication token is in localStorage
- Check browser console for CORS errors
- Use browser network tab to inspect requests

### Components not rendering
- Check TypeScript compilation errors: `npx tsc --noEmit`
- Verify imports use correct paths: `@/components/...`
- Check for console errors in browser DevTools

### Form submission not working
- Verify API endpoint exists
- Check request payload in network tab
- Verify authentication token is valid
- Check backend error logs

## 📞 Support

For issues:
1. Check this documentation
2. Review INTEGRATION_EXAMPLES.md
3. Check browser console for errors
4. Verify API endpoints are implemented
5. Test with mock data first

## 🎉 You're Ready!

Installation is complete. The system is ready for:
- ✅ User profile management
- ✅ Saved addresses management
- ✅ Security settings
- ✅ Order ratings and reviews

Start by navigating to `/customer/settings` to test the Profile Settings page!
