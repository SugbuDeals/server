# Fixed Subscription Tier System - Implementation Documentation

## Overview

The subscription system has been converted from a dynamic database-driven model to a **fixed two-tier system** (BASIC and PRO) with automatic tier assignment and usage-based limits.

---

## Subscription Tiers

### BASIC Tier (Free)
- **Default:** All users automatically get BASIC tier on signup
- **Price:** Free

### PRO Tier
- **Price:** 100 PHP per month
- **Upgrade:** Users can upgrade anytime via API

---

## Tier Limits by User Role

### Consumers

| Feature | BASIC | PRO |
|---------|-------|-----|
| **Store Search Radius** | 1 km | 3 km |

### Retailers

| Feature | BASIC | PRO |
|---------|-------|-----|
| **Maximum Products** | 10 per store | Unlimited |
| **Maximum Promotions** | 5 total | Unlimited |
| **Products per Promotion** | 10 max | Unlimited |

### Admins
- No tier limits apply
- Can access all analytics

---

## API Endpoints

### User Endpoints

#### Get Current Tier
```http
GET /subscription/me
Authorization: Bearer {token}
```
**Response:**
```json
{
  "userId": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "tier": "BASIC",
  "role": "CONSUMER"
}
```

#### Upgrade to PRO
```http
POST /subscription/upgrade
Authorization: Bearer {token}
```
**Access:** CONSUMER, RETAILER only  
**Response:** Updated user object with PRO tier

#### Downgrade to BASIC
```http
POST /subscription/downgrade
Authorization: Bearer {token}
```
**Access:** CONSUMER, RETAILER only  
**Response:** Updated user object with BASIC tier

### Admin Endpoints

#### Get Subscription Analytics
```http
GET /subscription/analytics
Authorization: Bearer {token}
```
**Access:** ADMIN only  
**Response:**
```json
{
  "totalUsers": 100,
  "basicUsers": 60,
  "proUsers": 40,
  "byRoleAndTier": {
    "consumer": { "basic": 30, "pro": 20, "total": 50 },
    "retailer": { "basic": 25, "pro": 15, "total": 40 },
    "admin": { "basic": 5, "pro": 5, "total": 10 }
  },
  "revenue": {
    "monthly": 4000,
    "yearly": 48000,
    "currency": "PHP"
  }
}
```

---

## Tier Enforcement

### Automatic Enforcement
Tier limits are automatically enforced through **guards** on relevant routes:

1. **Store Nearby Search** (`GET /store/nearby`)
   - Consumers: Radius parameter checked against tier limit
   - Error if radius exceeds tier limit

2. **Product Creation** (`POST /product`)
   - Retailers: Product count checked before creation
   - Error if limit exceeded

3. **Promotion Creation** (`POST /promotions`)
   - Retailers: Promotion count checked before creation
   - Error if limit exceeded
   - Products per promotion checked

### Error Responses
When tier limit is exceeded:
```json
{
  "statusCode": 403,
  "message": "BASIC tier allows a maximum of 10 products. Upgrade to PRO for unlimited products."
}
```

---

## Database Changes

### Removed Tables
- ❌ `Subscription` (no longer needed)
- ❌ `UserSubscription` (no longer needed)

### Removed Enums
- ❌ `SubscriptionPlan`
- ❌ `SubscriptionStatus`
- ❌ `BillingCycle`

### Added

#### New Enum: `SubscriptionTier`
```prisma
enum SubscriptionTier {
  BASIC
  PRO
}
```

#### Updated User Model
```prisma
model User {
  // ... existing fields
  subscriptionTier SubscriptionTier @default(BASIC)
}
```

### Promotion Changes
Changed to **many-to-many relationship**:

```prisma
model Promotion {
  id          Int       @id @default(autoincrement())
  // ... other fields
  promotionProducts PromotionProduct[] // Many-to-many
}

model PromotionProduct {
  id          Int      @id @default(autoincrement())
  promotionId Int
  productId   Int
  
  promotion Promotion @relation(...)
  product   Product   @relation(...)
  
  @@unique([promotionId, productId])
}
```

---

## Promotion API Changes

### Create Promotion (Updated)
```http
POST /promotions
```
**Request Body:**
```json
{
  "title": "Summer Sale",
  "type": "percentage",
  "description": "25% off",
  "discount": 25,
  "productIds": [1, 2, 3]  // Array of products
}
```

### Add Products to Promotion (New)
```http
POST /promotions/:id/products
```
**Request Body:**
```json
{
  "productIds": [4, 5, 6]
}
```

---

## Implementation Components

### Services
- **`SubscriptionService`** - Handles tier upgrades/downgrades and analytics

### Guards
- **`SubscriptionTierGuard`** - Enforces tier limits on routes

### Decorators
- **`@TierLimit(type)`** - Marks routes for tier checking
  - `TierLimitType.CONSUMER_RADIUS`
  - `TierLimitType.RETAILER_PRODUCT_COUNT`
  - `TierLimitType.RETAILER_PROMOTION_COUNT`
  - `TierLimitType.RETAILER_PRODUCTS_PER_PROMOTION`

### DTOs
- `SubscriptionTierResponseDto` - Tier information response
- `SubscriptionAnalyticsDto` - Analytics response
- `AddProductsToPromotionDto` - Add products to promotion

---

## Usage Examples

### Check if User Can Create Product (Internal Logic)
```typescript
// Automatically handled by guard on POST /product route
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionTierGuard)
@TierLimit(TierLimitType.RETAILER_PRODUCT_COUNT)
@Post()
createProduct() {
  // If execution reaches here, user has permission
}
```

### Frontend Integration Example
```typescript
// Check user's tier
const tierInfo = await fetch('/subscription/me');
// { tier: 'BASIC', role: 'CONSUMER' }

// Upgrade if needed
if (tierInfo.tier === 'BASIC') {
  await fetch('/subscription/upgrade', { method: 'POST' });
}

// Search nearby stores (radius auto-limited by tier)
const stores = await fetch('/store/nearby?latitude=10.3&longitude=123.8&radius=2');
// BASIC consumer: Error if radius > 1km
// PRO consumer: Success if radius <= 3km
```

---

## Migration Notes

### For Existing Users
- All existing users default to BASIC tier
- No data loss - user accounts remain intact
- Previous subscription data removed (no longer applicable)

### Payment Integration
Current implementation is a **simple upgrade/downgrade** system. For production:
- Integrate payment gateway (Stripe, PayPal, etc.)
- Add payment verification before upgrade
- Implement subscription renewal logic
- Add webhook handlers for payment events

---

## Testing

Comprehensive test suites included:
- ✅ 49 tests total
- ✅ Unit tests for services and controllers
- ✅ Guard tests for tier enforcement
- ✅ E2E tests for API endpoints
- ✅ Zero TypeScript errors

Run tests:
```bash
npm test -- --testPathPatterns="subscription"
```

---

## Benefits of Fixed Tier System

1. **Simplicity** - Only two tiers to manage
2. **Performance** - No complex database queries for subscription status
3. **Automatic** - Users start with BASIC immediately
4. **Clear Limits** - Easy to understand and communicate
5. **Scalable** - Simple to add new limits or adjust existing ones

---

## Future Enhancements

Potential additions:
- Payment gateway integration
- Subscription expiry/renewal system
- Trial periods for PRO tier
- Usage analytics per user
- Tier-based feature flags
- Custom tier limits per enterprise customer

---

## Support

For questions or issues:
- Check API documentation: `/api` (Swagger UI)
- Review test files for usage examples
- See `TEST_SUMMARY.md` for detailed test documentation

