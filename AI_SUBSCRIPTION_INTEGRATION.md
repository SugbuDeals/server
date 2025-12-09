# AI Chat Subscription Integration

## Overview

The AI chat system has been enhanced to respect subscription tier limits for consumer users and only recommend products from active, verified stores.

## Changes Made

### 1. Subscription Tier Enforcement for Consumers

The AI chat now enforces radius limits based on the user's subscription tier:

- **BASIC Tier**: Maximum 1km search radius
- **PRO Tier**: Maximum 3km search radius
- **Retailers & Admins**: No radius limit

#### Implementation Details

**`src/ai/ai.service.ts`**:
- Added `userId` and `userRole` parameters to the `chat()` method
- Queries the user's subscription tier from the database for consumers
- Caps the effective radius based on the tier limit
- Logs warnings when a consumer requests a radius exceeding their tier limit
- Passes the tier-limited radius to all tool calls and response builders

**`src/ai/ai.controller.ts`**:
- Injects the authenticated user from the request using `@Request()` decorator
- Passes `userId` and `userRole` to the AI service

### 2. Product and Store Filtering

All AI recommendations now strictly filter to only include:

- **Products**: Only from verified and active stores
- **Stores**: Only verified and active stores
- **Promotions**: Only from verified and active stores

#### Existing Filters Enhanced

The following methods already had verification filters, which remain in place:

- `searchProductsTool()`: Filters products by `isActive: true` and `store.verificationStatus: VERIFIED`
- `searchStoresTool()`: Uses `findNearby()` with `onlyVerified: true` and `onlyActive: true`
- `searchPromotionsTool()`: Manually filters promotions to only include those from verified stores
- `buildChatResponse()`: Re-applies verification filters when fetching products/stores/promotions
- `buildRecommendationResponse()`: Re-applies verification filters for all recommendations

### 3. Radius Filtering in Response Builder

**`buildChatResponse()` method**:
- Added `radiusKm` parameter to accept the tier-limited radius
- Filters products and stores that exceed the radius limit
- Returns `null` for items outside the radius, which are then filtered out
- Ensures consumers only see recommendations within their tier's allowed radius

### 4. Test Updates

**`src/ai/ai.controller.spec.ts`**:
- Updated test to mock the authenticated user request
- Includes `userId` and `userRole` in the test expectations
- Verifies the service is called with correct tier-related parameters

## Usage Example

### Consumer with BASIC Tier (1km limit)

```typescript
// Request
POST /ai/chat
Authorization: Bearer <consumer_token>
{
  "content": "Find me electronics stores near me",
  "latitude": 10.3157,
  "longitude": 123.8854,
  "radius": 5,  // User requests 5km
  "count": 5
}

// Behavior
// - System detects user is CONSUMER with BASIC tier
// - Caps radius to 1km (BASIC tier limit)
// - Logs warning: "Consumer 123 requested 5km radius, capped to 1km (BASIC tier)"
// - Returns only stores within 1km
// - AI response mentions the 1km limit
```

### Consumer with PRO Tier (3km limit)

```typescript
// Request
POST /ai/chat
Authorization: Bearer <consumer_token>
{
  "content": "Show me products nearby",
  "latitude": 10.3157,
  "longitude": 123.8854,
  "radius": 5,  // User requests 5km
  "count": 5
}

// Behavior
// - System detects user is CONSUMER with PRO tier
// - Caps radius to 3km (PRO tier limit)
// - Logs warning: "Consumer 456 requested 5km radius, capped to 3km (PRO tier)"
// - Returns only products within 3km
// - AI response mentions the 3km limit
```

### Retailer (No limit)

```typescript
// Request
POST /ai/chat
Authorization: Bearer <retailer_token>
{
  "content": "Find products in my area",
  "latitude": 10.3157,
  "longitude": 123.8854,
  "radius": 10,  // User requests 10km
  "count": 5
}

// Behavior
// - System detects user is RETAILER
// - No radius capping applied
// - Returns products within 10km as requested
// - No tier limit mentioned in response
```

## Verification and Active Status

All AI recommendations now strictly enforce:

1. **Products**:
   - `product.isActive === true`
   - `product.store.verificationStatus === 'VERIFIED'`
   - `product.store.isActive === true`

2. **Stores**:
   - `store.verificationStatus === 'VERIFIED'`
   - `store.isActive === true`

3. **Promotions**:
   - Promotion's associated store must be verified and active
   - Checked via the first product in the promotion

## System Prompt Updates

The AI system prompt now includes tier-specific context:

```
LOCATION CONTEXT: The user has provided their location coordinates (latitude: X, longitude: Y). 
When using search tools, ALWAYS include these coordinates in your tool calls to prioritize nearby 
results within a Xkm radius. Results will be sorted by both relevance to the query and proximity 
to the user. The user's BASIC tier (1km max) subscription limits search radius to 1km.
```

## Benefits

1. **Fair Usage**: Consumers are limited to their tier's radius, encouraging PRO upgrades
2. **Quality Control**: Only verified and active stores/products are recommended
3. **Transparency**: Users are informed about their tier limits in AI responses
4. **Logging**: System logs radius capping for monitoring and debugging
5. **Consistent Enforcement**: Tier limits apply to all AI-powered searches

## Technical Notes

- Tier checking happens once per chat request (cached in `effectiveRadius`)
- Database query for tier is minimal (only `subscriptionTier` field)
- Radius filtering happens in-memory after relevance filtering
- No changes to existing tool schemas or Groq API integration
- Backward compatible with existing AI functionality

