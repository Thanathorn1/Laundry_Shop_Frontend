# Quick Reference Guide

Fast lookup guide for the Customer Profile & Rating System.

## 📚 Files Created

| File | Purpose |
|------|---------|
| `components/BottomSheet.tsx` | Mobile-first modal component |
| `components/StarRating.tsx` | 1-5 star rating selector |
| `components/RatingModal.tsx` | Complete rating form |
| `components/ProfileForm.tsx` | Profile info editor |
| `components/SavedAddresses.tsx` | Address management |
| `components/SecuritySettings.tsx` | Password & device security |
| `app/customer/settings/page.tsx` | Main settings hub |
| `app/customer/orders/page.tsx` | Orders list with ratings |
| `app/customer/orders/rate/page.tsx` | Standalone rating page |

## 🔗 Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/customer/settings` | settings/page.tsx | Profile settings hub |
| `/customer/settings?tab=basic` | ProfileForm | Basic info (default) |
| `/customer/settings?tab=addresses` | SavedAddresses | Address management |
| `/customer/settings?tab=security` | SecuritySettings | Security settings |
| `/customer/orders` | orders/page.tsx | Order list |
| `/customer/orders/rate?orderId=123` | rate/page.tsx | Rate specific order |

## 🎨 Components Cheat Sheet

### BottomSheet
```tsx
<BottomSheet isOpen={bool} onClose={fn} title="str" showCloseButton={bool}>
  {children}
</BottomSheet>
```

### StarRating
```tsx
<StarRating 
  rating={0-5} 
  onRatingChange={(n) => {}} 
  readonly={bool}
  size="sm|md|lg"
/>
```

### RatingModal
```tsx
<RatingModal
  isOpen={bool}
  onClose={() => {}}
  orderId="str"
  onSubmit={async (data) => {}}
/>
```
**Data returned:**
```typescript
{
  orderId: string,
  merchantRating: 1-5,
  riderRating: 1-5,
  merchantComment?: string,
  riderComment?: string
}
```

### ProfileForm
```tsx
<ProfileForm
  profile={UserProfile | null}
  isLoading={bool}
  onProfileUpdate={(profile) => {}}
/>
```

### SavedAddresses
```tsx
<SavedAddresses />
// Manages entire lifecycle: fetch, add, delete, set default
```

### SecuritySettings
```tsx
<SecuritySettings />
// Manages: password changes, device logout
```

## 📡 API Calls

All use `apiFetch(endpoint, options)` with auth token automatically included.

### Profile
```typescript
// Get profile
const profile = await apiFetch('/customers/profile');

// Update profile
await apiFetch('/customers/profile', {
  method: 'PATCH',
  body: JSON.stringify({ firstName, lastName, email, phoneNumber })
});

// Upload image
await apiFetch('/customers/profile/upload', {
  method: 'PATCH',
  body: formData  // FormData with 'profileImage' file
});
```

### Addresses
```typescript
// Get all
const data = await apiFetch('/customers/saved-addresses');

// Add
await apiFetch('/customers/saved-addresses', {
  method: 'POST',
  body: JSON.stringify({ label, address, latitude, longitude, isDefault })
});

// Set default
await apiFetch(`/customers/saved-addresses/{id}/default`, {
  method: 'PATCH'
});

// Delete
await apiFetch(`/customers/saved-addresses/{id}`, {
  method: 'DELETE'
});
```

### Security
```typescript
// Change password
await apiFetch('/customers/security/change-password', {
  method: 'POST',
  body: JSON.stringify({ currentPassword, newPassword })
});

// Get devices
const data = await apiFetch('/customers/security/devices');

// Logout device
await apiFetch(`/customers/security/devices/{id}/logout`, {
  method: 'POST'
});
```

### Orders & Ratings
```typescript
// Get orders
const data = await apiFetch('/customers/orders');

// Get order
const order = await apiFetch(`/customers/orders/{orderId}`);

// Submit rating
await apiFetch(`/customers/orders/{orderId}/rating`, {
  method: 'POST',
  body: JSON.stringify({
    orderId,
    merchantRating: 1-5,
    riderRating: 1-5,
    merchantComment?: 'str',
    riderComment?: 'str'
  })
});
```

## 🎯 Common Tasks

### Integrate Rating Button into Order List
```tsx
{order.status === 'completed' && !order.hasRating && (
  <button onClick={() => setShowRatingModal(true)}>
    Rate
  </button>
)}

<RatingModal
  isOpen={showRatingModal}
  orderId={order.id}
  onClose={() => setShowRatingModal(false)}
  onSubmit={handleRatingSubmit}
/>
```

### Show Pending Ratings Count
```tsx
const unratedCount = orders.filter(
  o => o.status === 'completed' && !o.hasRating
).length;
```

### Display Rating (Read-only)
```tsx
<StarRating 
  rating={order.rating?.merchantRating || 0}
  readonly 
/>
```

### Link to Settings
```tsx
<Link href="/customer/settings">Settings</Link>
<Link href="/customer/settings?tab=addresses">Addresses</Link>
<Link href="/customer/settings?tab=security">Security</Link>
```

### Link to Rate Order
```tsx
<Link href={`/customer/orders/rate?orderId=${order.id}`}>
  Rate Order
</Link>
```

## 🎨 Tailwind Classes Used

| Purpose | Classes |
|---------|---------|
| Primary button | `bg-blue-600 hover:bg-blue-700 text-white` |
| Secondary button | `border-2 border-blue-600 text-blue-600` |
| Success state | `bg-green-100 text-green-800` |
| Error state | `bg-red-50 text-red-700` |
| Loading spinner | `animate-spin text-blue-600` |
| Card | `rounded-lg border border-gray-200 bg-white p-6 shadow` |
| Input | `rounded-lg border border-gray-200 bg-gray-50 px-4 py-2` |
| Modal overlay | `fixed inset-0 bg-black/50 z-40` |

## 📦 Type Definitions

```typescript
// UserProfile
{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneVerified: boolean;
  profileImageUrl?: string;
}

// SavedAddress
{
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

// LoginDevice
{
  id: string;
  deviceName: string;
  lastAccessedAt: string;
  ipAddress: string;
  isCurrent: boolean;
}

// RatingData
{
  orderId: string;
  merchantRating: number;
  riderRating: number;
  merchantComment?: string;
  riderComment?: string;
}
```

## 🔑 Props Summary

| Component | Key Props |
|-----------|-----------|
| BottomSheet | `isOpen`, `onClose`, `title`, `children` |
| StarRating | `rating`, `onRatingChange`, `readonly`, `size` |
| RatingModal | `isOpen`, `onClose`, `orderId`, `onSubmit` |
| ProfileForm | `profile`, `isLoading`, `onProfileUpdate` |
| SavedAddresses | (none - manages everything internally) |
| SecuritySettings | (none - manages everything internally) |

## 🔄 State Management Pattern

All components follow this pattern:
```tsx
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);
const [status, setStatus] = useState('idle'); // idle|loading|success|error

useEffect(() => {
  fetchData();
}, []);

const handleAction = async () => {
  try {
    setStatus('loading');
    const result = await apiFetch(endpoint);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  } catch(err) {
    setError(err.message);
    setStatus('error');
  }
};
```

## ⚡ Performance Tips

1. Use Suspense for page-level loading
2. Components memo() for expensive renders
3. useCallback() for event handlers
4. Lazy loading for modal content
5. Debounce search inputs
6. Cache API responses when appropriate

## 🎭 UI States

Every component handles:
- **Idle**: Initial state, ready for interaction
- **Loading**: Fetching data or submitting
- **Success**: Action completed, show confirmation
- **Error**: Show error message with retry option

## 📱 Responsive Breakpoints

- **Mobile**: Default (< 640px)
- **Tablet**: `sm:` (≥ 640px)
- **Desktop**: Implied (≥ 1024px)

Bottom sheets appear on mobile, full modals on desktop.

## 🔍 Debug Tips

1. Open React DevTools to inspect component state
2. Check Network tab for API requests
3. Console errors for type mismatches
4. localStorage has access_token
5. API base URL is correct
6. Test with mock data first

## 📞 Error Messages

Common errors and solutions:

| Error | Solution |
|-------|----------|
| "gRUDAเขา้สู่ระบบใหม่อีกครั้ง" | Token expired, refresh auth |
| "Failed to load profile" | Check API endpoint exists |
| "Unauthorized" | Verify access_token in localStorage |
| "404 Not Found" | Order doesn't exist or wrong ID |
| "CORS error" | Backend CORS not configured |

## 🚀 Deployment

1. Build: `npm run build`
2. Check for TypeScript errors
3. Test all routes production-like
4. Set environment variables
5. Deploy to production

## 📖 Full Documentation

- `PROFILE_RATING_GUIDE.md` - Complete component reference
- `INTEGRATION_EXAMPLES.md` - Real-world usage examples
- `SETUP_GUIDE.md` - Installation & configuration
