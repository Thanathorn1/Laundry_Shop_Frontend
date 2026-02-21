# Integration Examples

This document shows practical examples of how to integrate the Rating System and Profile components into your existing customer pages.

## 🎯 Quick Integration Examples

### 1. Adding a Rating Button to Order Cards

```tsx
// In your order list or order card component
import RatingModal from '@/components/RatingModal';
import { Star } from 'lucide-react';
import { useState } from 'react';

export default function OrderCard({ order }) {
  const [showRating, setShowRating] = useState(false);

  return (
    <>
      <div className="rounded-lg border p-4">
        <h3>Order #{order.orderNumber}</h3>
        
        {/* Show rating button only for completed orders without ratings */}
        {order.status === 'completed' && !order.hasRating && (
          <button
            onClick={() => setShowRating(true)}
            className="mt-4 rounded-lg bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 font-semibold"
          >
            <Star size={16} className="inline mr-2" />
            Rate This Order
          </button>
        )}

        {/* Show rated badge if already rated */}
        {order.hasRating && (
          <div className="mt-4 text-sm text-green-600">
            ✓ You've already rated this order
          </div>
        )}
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        orderId={order.id}
        onSubmit={async (data) => {
          await apiFetch(`/customers/orders/${order.id}/rating`, {
            method: 'POST',
            body: JSON.stringify(data),
          });
          // Refresh order or update state
          setShowRating(false);
        }}
      />
    </>
  );
}
```

### 2. Floating Action Button for Ratings

```tsx
// Floating button to show pending ratings
import { useState, useEffect } from 'react';
import { Bell, Star } from 'lucide-react';
import RatingModal from '@/components/RatingModal';

export default function RatingFloatingButton() {
  const [pendingRatings, setPendingRatings] = useState(0);
  const [showRatingList, setShowRatingList] = useState(false);
  const [unratedOrders, setUnratedOrders] = useState([]);

  useEffect(() => {
    fetchUnratedOrders();
  }, []);

  const fetchUnratedOrders = async () => {
    const data = await apiFetch('/customers/orders?rated=false&status=completed');
    setUnratedOrders(data.orders || []);
    setPendingRatings(data.orders?.length || 0);
  };

  if (pendingRatings === 0) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowRatingList(true)}
        className="fixed bottom-6 right-6 rounded-full bg-yellow-500 shadow-lg hover:shadow-xl p-4 text-white z-40 hover:bg-yellow-600 transition-all"
        title={`${pendingRatings} pending rating${pendingRatings > 1 ? 's' : ''}`}
      >
        <div className="relative">
          <Star size={24} />
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {pendingRatings}
          </span>
        </div>
      </button>

      {/* Ratings List Modal */}
      {showRatingList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-96 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Pending Ratings ({pendingRatings})</h2>
              
              <div className="space-y-3">
                {unratedOrders.map(order => (
                  <RatingCard 
                    key={order.id} 
                    order={order}
                    onRated={() => {
                      fetchUnratedOrders();
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => setShowRatingList(false)}
                className="w-full mt-4 rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RatingCard({ order, onRated }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
        <h3 className="font-semibold">{order.merchantName}</h3>
        <p className="text-sm text-gray-600">Order #{order.orderNumber}</p>
        <button
          onClick={() => setShowModal(true)}
          className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Rate Now
        </button>
      </div>

      <RatingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        orderId={order.id}
        onSubmit={async (data) => {
          await apiFetch(`/customers/orders/${order.id}/rating`, {
            method: 'POST',
            body: JSON.stringify(data),
          });
          setShowModal(false);
          onRated();
        }}
      />
    </>
  );
}
```

### 3. Inline Rating Display

```tsx
// Show ratings directly in order details
import StarRating from '@/components/StarRating';

export default function OrderDetails({ order }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Your Ratings</h2>

        {order.rating ? (
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Merchant Rating</h3>
              <StarRating 
                rating={order.rating.merchantRating} 
                onRatingChange={() => {}}
                readonly 
              />
              <p className="text-sm text-gray-600 mt-2">
                {order.rating.merchantComment}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Rider Rating</h3>
              <StarRating 
                rating={order.rating.riderRating} 
                onRatingChange={() => {}}
                readonly 
              />
              <p className="text-sm text-gray-600 mt-2">
                {order.rating.riderComment}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">This order hasn't been rated yet</p>
        )}
      </div>
    </div>
  );
}
```

### 4. Profile Settings in Drawer/Modal

```tsx
// Add profile settings link in a drawer or header menu
import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function CustomerHeader() {
  return (
    <header className="bg-white shadow">
      <nav className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">My App</h1>
        
        <Link
          href="/customer/settings"
          className="inline-flex items-center gap-2 rounded-lg hover:bg-gray-100 p-2 text-gray-700"
          title="Profile Settings"
        >
          <Settings size={24} />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      </nav>
    </header>
  );
}
```

### 5. Post-Order Rating Popup

```tsx
// Show a promotional popup after order completion
import { useState, useEffect } from 'react';
import RatingModal from '@/components/RatingModal';
import { AlertCircle } from 'lucide-react';

export default function PostOrderRating({ orderId, onDismiss }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show after 3 seconds
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <>
      {/* Banner */}
      <div className="fixed bottom-4 right-4 z-40 bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <h3 className="font-semibold">Rate Your Order</h3>
            <p className="text-sm text-gray-600">
              Help us improve by rating your experience
            </p>
            <button
              onClick={() => setShow(false)}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Rate Now
            </button>
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={show && false} // Set to true to show modal
        onClose={() => setShow(false)}
        orderId={orderId}
        onSubmit={async (data) => {
          await apiFetch(`/customers/orders/${orderId}/rating`, {
            method: 'POST',
            body: JSON.stringify(data),
          });
        }}
      />
    </>
  );
}
```

### 6. Address Selection for Order

```tsx
// Use SavedAddresses for quick address selection
import { useState } from 'react';
import SavedAddresses from '@/components/SavedAddresses';

export default function AddressSelector({ onSelectAddress }) {
  const [showAddresses, setShowAddresses] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowAddresses(true)}
        className="rounded-lg border-2 border-blue-600 px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50"
      >
        Select Saved Address
      </button>

      <BottomSheet
        isOpen={showAddresses}
        onClose={() => setShowAddresses(false)}
        title="Select Delivery Address"
      >
        <SavedAddresses />
      </BottomSheet>
    </>
  );
}
```

### 7. Skip Integration (Simple Manual Rating)

```tsx
// If you want to handle rating manually without the full RatingModal
import { apiFetch } from '@/lib/api';
import StarRating from '@/components/StarRating';
import { useState } from 'react';

export default function ManualRating({ orderId }) {
  const [merchantRating, setMerchantRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await apiFetch(`/customers/orders/${orderId}/rating`, {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          merchantRating,
          riderRating,
          merchantComment: comment,
          riderComment: comment,
        }),
      });
      alert('Rating submitted!');
    } catch (error) {
      alert('Failed to submit rating');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-semibold mb-2">Rate Merchant</label>
        <StarRating rating={merchantRating} onRatingChange={setMerchantRating} />
      </div>

      <div>
        <label className="block font-semibold mb-2">Rate Rider</label>
        <StarRating rating={riderRating} onRatingChange={setRiderRating} />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)"
        className="w-full p-2 border rounded-lg"
      />

      <button
        onClick={handleSubmit}
        disabled={isLoading || merchantRating === 0 || riderRating === 0}
        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Submitting...' : 'Submit Rating'}
      </button>
    </div>
  );
}
```

## 📱 Mobile-Specific Integration

### Using Bottom Sheet in Modals

```tsx
import BottomSheet from '@/components/BottomSheet';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Menu</button>
      
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Menu">
        <nav className="space-y-2">
          <Link href="/customer/profile" className="block p-3 hover:bg-gray-100">
            Profile
          </Link>
          <Link href="/customer/settings" className="block p-3 hover:bg-gray-100">
            Settings
          </Link>
          <Link href="/customer/orders" className="block p-3 hover:bg-gray-100">
            Orders
          </Link>
        </nav>
      </BottomSheet>
    </>
  );
}
```

## ✅ Common Patterns

### Pattern 1: Load data → Show loading → Display content → Handle errors
```tsx
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  (async () => {
    try {
      setIsLoading(true);
      const result = await apiFetch(endpoint);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  })();
}, []);

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
return <div>{/* Render data */}</div>;
```

### Pattern 2: Form submission with validation
```tsx
const [formData, setFormData] = useState({ field: '' });
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate
  if (!formData.field) {
    setError('Field is required');
    return;
  }

  try {
    setIsLoading(true);
    await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

## 🎨 Theming & Customization

All components use Tailwind CSS and can be customized via:
1. Tailwind config
2. Direct class modifications
3. CSS variables (if set up)

Common colors to customize:
- `bg-blue-600` → Primary action
- `bg-blue-50` → Light backgrounds
- `text-blue-600` → Primary text
- `border-gray-200` → Borders
- `bg-gray-50` → Form backgrounds

