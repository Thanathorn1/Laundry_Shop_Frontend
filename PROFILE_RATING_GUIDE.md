# Customer Profile & Rating System Documentation

This document provides a comprehensive guide to the User Profile Settings page and Rating & Review System implemented for your customer-facing application.

## 📁 File Structure

```
components/
├── BottomSheet.tsx          # Reusable bottom sheet component (mobile-first)
├── StarRating.tsx           # Star rating component (1-5 stars)
├── RatingModal.tsx          # Complete rating form with bottom sheet
├── ProfileForm.tsx          # Profile information editing
├── SavedAddresses.tsx       # Saved addresses management
└── SecuritySettings.tsx     # Password & device security

app/
├── customer/
│   ├── settings/
│   │   └── page.tsx         # Main profile settings page with tabs
│   └── orders/
│       └── rate/
│           └── page.tsx     # Order rating page

lib/
└── types.d.ts               # TypeScript type definitions
```

## 🎨 Components Overview

### 1. **BottomSheet Component**
- **Purpose**: Reusable modal component optimized for mobile devices
- **Features**:
  - Slides up from bottom on mobile/small screens
  - Overlay backdrop with close functionality
  - Header with title and close button
  - Responsive and accessible
- **Usage**:
```tsx
<BottomSheet 
  isOpen={isOpen} 
  onClose={handleClose} 
  title="Sheet Title"
>
  {/* Content here */}
</BottomSheet>
```

### 2. **StarRating Component**
- **Purpose**: Interactive star rating selector (1-5 stars)
- **Features**:
  - Interactive hover effects
  - Multiple size options (sm, md, lg)
  - Read-only mode for displaying ratings
  - Lucide React Star icons
- **Props**:
  - `rating`: Current rating (0-5)
  - `onRatingChange`: Callback when rating changes
  - `readonly`: Disable interaction
  - `size`: 'sm' | 'md' | 'lg'

### 3. **RatingModal Component**
- **Purpose**: Complete order rating form
- **Features**:
  - Separate ratings for merchant and rider (1-5 stars each)
  - Optional text comments for each
  - Form validation
  - Success/error states
  - Bottom sheet on mobile
- **Usage**:
```tsx
<RatingModal
  isOpen={isOpen}
  onClose={handleClose}
  orderId="order-id"
  onSubmit={async (data) => {
    await submitRating(data);
  }}
/>
```

### 4. **ProfileForm Component**
- **Purpose**: Edit basic profile information
- **Features**:
  - Edit first name, last name, email, phone
  - Profile picture upload
  - Phone verification status badge
  - Auto-save with status notifications
  - Error handling
- **Data managed**:
  - First Name
  - Last Name
  - Email
  - Phone Number (with verified status)
  - Profile Image

### 5. **SavedAddresses Component**
- **Purpose**: Manage frequently used delivery addresses
- **Features**:
  - Display saved addresses with labels (Home, Work, etc.)
  - Add new addresses via bottom sheet form
  - Delete addresses with confirmation
  - Set default address
  - Latitude/Longitude storage for mapping
  - Error handling for API failures
- **API Integration**:
  - GET `/customers/saved-addresses` - Fetch all addresses
  - POST `/customers/saved-addresses` - Add new address
  - PATCH `/customers/saved-addresses/{id}/default` - Set as default
  - DELETE `/customers/saved-addresses/{id}` - Delete address

### 6. **SecuritySettings Component**
- **Purpose**: Password management and device security
- **Features**:
  - Change password with current password verification
  - Password strength requirements (8+ chars)
  - View logged-in devices
  - Logout from specific devices
  - Last accessed timestamp for devices
  - Current device indicator
- **API Integration**:
  - POST `/customers/security/change-password` - Change password
  - GET `/customers/security/devices` - Fetch devices
  - POST `/customers/security/devices/{id}/logout` - Logout device

## 📄 Pages & Routes

### Profile Settings Page
**Route**: `/customer/settings`

**Features**:
- Tabbed interface for different settings sections:
  - **Basic Info**: Edit profile details, upload picture
  - **Saved Addresses**: Manage delivery addresses
  - **Security**: Change password, manage devices
- Mobile-responsive design
- Tab persistence (remembers active tab)
- Real-time error handling

### Order Rating Page
**Route**: `/customer/orders/rate?orderId={orderId}`

**Features**:
- Display order details (order number, merchant, rider, amount)
- Opens rating modal
- Separate ratings for merchant and rider
- Optional feedback comments
- Success confirmation before redirect

## 🔌 API Integration

All API calls use the `apiFetch` helper from `@/lib/api`, which:
- Automatically includes authentication token from localStorage
- Handles authorization errors
- Parses JSON responses
- Throws errors for failed requests

### Profile Endpoints
```
GET    /customers/profile              → Fetch user profile
PATCH  /customers/profile              → Update profile info
PATCH  /customers/profile/upload       → Upload profile image
```

### Addresses Endpoints
```
GET    /customers/saved-addresses              → Fetch all addresses
POST   /customers/saved-addresses              → Create new address
PATCH  /customers/saved-addresses/{id}/default → Set as default
DELETE /customers/saved-addresses/{id}         → Delete address
```

### Security Endpoints
```
POST  /customers/security/change-password      → Change password
GET   /customers/security/devices              → Fetch logged-in devices
POST  /customers/security/devices/{id}/logout  → Logout device
```

### Order Rating Endpoints
```
POST  /customers/orders/{id}/rating → Submit order rating
```

## 🎯 Usage Examples

### Adding Rating to Order List

```tsx
// In your order list component
import RatingModal from '@/components/RatingModal';

export default function OrdersList() {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  return (
    <>
      {orders.map(order => (
        <div key={order.id}>
          <h3>{order.orderNumber}</h3>
          {order.status === 'completed' && (
            <button onClick={() => setSelectedOrder(order.id)}>
              Rate Order
            </button>
          )}
        </div>
      ))}

      {selectedOrder && (
        <RatingModal
          isOpen={true}
          onClose={() => setSelectedOrder(null)}
          orderId={selectedOrder}
          onSubmit={async (data) => {
            await apiFetch(`/customers/orders/${data.orderId}/rating`, {
              method: 'POST',
              body: JSON.stringify(data),
            });
          }}
        />
      )}
    </>
  );
}
```

### Using StarRating Standalone

```tsx
import StarRating from '@/components/StarRating';

export default function RatingExample() {
  const [rating, setRating] = useState(0);

  return (
    <StarRating 
      rating={rating} 
      onRatingChange={setRating}
      size="lg"
    />
  );
}
```

### Using BottomSheet

```tsx
import BottomSheet from '@/components/BottomSheet';

export default function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open</button>
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="My Modal"
      >
        <p>Modal content here</p>
      </BottomSheet>
    </>
  );
}
```

## 🎨 Design Features

### Mobile-First Responsive Design
- Bottom sheets for modal interactions on mobile
- Tab buttons show icons on mobile, icons + text on desktop
- Flexible grid layouts with `sm:` breakpoints
- Touch-friendly button sizes (48px minimum)

### Lucide React Icons
All icons use Lucide React for consistency:
- Profile management: `User`, `Camera`, `CheckCircle`
- Addresses: `MapPin`, `Trash2`, `Plus`
- Security: `Lock`, `Smartphone`, `AlertCircle`
- Rating: `Star` (filled/unfilled states)
- UI: `Loader`, `X`, `ChevronRight`, `ArrowLeft`

### Tailwind CSS Styling
- Color scheme: Blue tones (primary), Gray (neutral), Green (success), Red (error)
- Rounded corners: `rounded-lg`, `rounded-2xl`, `rounded-t-3xl`
- Shadow effects for depth
- Smooth transitions for interactive elements
- Focus states with ring effects

## 🔒 Security Considerations

1. **Authentication**: Token stored in localStorage, included in all requests
2. **Password Validation**: 8+ character requirement enforced
3. **Device Management**: Users can logout unfamiliar devices
4. **Form Validation**: Client-side validation before submission
5. **Error Handling**: User-friendly error messages without exposing system details

## 📱 Responsive Breakpoints

- **Mobile**: Default styles (< 640px)
- **Tablet**: `sm:` prefix (≥ 640px)
- **Desktop**: Larger sizes and full layouts

## 🚀 Installation & Setup

1. **Install Dependencies**:
```bash
npm install lucide-react
```

2. **Import Components**:
```tsx
import ProfileForm from '@/components/ProfileForm';
import RatingModal from '@/components/RatingModal';
```

3. **Ensure API Base URL** is set in environment:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## 🐛 Error Handling

All components include:
- Try-catch blocks for API calls
- User-friendly error messages
- Error state UI with AlertCircle icon
- Automatic error dismissal after 3 seconds
- Fallback loading states during data fetching

## 📊 Type Definitions

Located in `lib/types.d.ts`:

```typescript
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneVerified: boolean;
  profileImageUrl?: string;
}

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

interface RatingSubmission {
  orderId: string;
  merchantRating: number;
  riderRating: number;
  merchantComment?: string;
  riderComment?: string;
}
```

## 💡 Best Practices

1. **Component Reusability**: BottomSheet and StarRating are designed to be reused
2. **Separation of Concerns**: Each component handles one feature
3. **Loading States**: Always show loading indicators for async operations
4. **Error Recovery**: Provide ways to retry failed operations
5. **Accessibility**: Labels, ARIA attributes, and keyboard support
6. **Performance**: Suspense fallbacks for page-level loading

## 🔄 State Management

Components use React hooks:
- `useState` for local form state
- `useEffect` for data fetching
- Callback functions for parent communication
- No external state management needed

## 📝 Notes

- All timestamps are in ISO 8601 format
- Coordinates are expected in decimal degrees (lat: -90 to 90, lng: -180 to 180)
- Phone numbers are stored as strings to support various formats
- Ratings are integers from 1 to 5
- Comments are optional text fields with 500 character limit (implement as needed)
