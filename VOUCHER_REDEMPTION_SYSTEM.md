# One-Time Voucher Redemption System

## Overview

The voucher redemption system enables retailers to offer one-time use vouchers that consumers can redeem in-store by presenting a QR code. The system is designed to be lightweight, secure, and simple to use, with minimal server resource requirements (optimized for 512MB RAM hosting).

## Key Features

- **One-Time Use**: Each voucher can only be redeemed once per consumer per store
- **QR Code Based**: Consumer generates a QR code with their qualification info
- **Two-Step Verification**: Retailer scans QR → verifies consumer → confirms redemption
- **Secure JWT Tokens**: Uses existing JWT infrastructure (no additional dependencies)
- **Lightweight**: No external QR libraries or heavy dependencies required
- **Role-Based**: Different flows for consumers and retailers

## Database Schema

### VoucherRedemption Model

```prisma
model VoucherRedemption {
  id          Int                     @id @default(autoincrement())
  userId      Int                     // Consumer who is redeeming
  promotionId Int                     // The voucher promotion
  storeId     Int                     // Store where redemption happens
  productId   Int?                    // Optional: specific product being redeemed
  status      VoucherRedemptionStatus @default(PENDING)
  createdAt   DateTime                @default(now()) // When consumer generated QR
  redeemedAt  DateTime?               // When retailer confirmed redemption

  @@unique([userId, promotionId, storeId]) // One redemption per user per voucher per store
  @@index([userId])
  @@index([promotionId])
  @@index([storeId])
  @@index([status])
}

enum VoucherRedemptionStatus {
  PENDING   // QR generated, waiting for retailer scan
  VERIFIED  // Retailer scanned and verified consumer
  REDEEMED  // Retailer confirmed, voucher consumed
  CANCELLED // Consumer cancelled or expired
}
```

## API Endpoints

### 1. Generate Voucher Token (Consumer)

**Endpoint**: `POST /promotions/voucher/generate`

**Role**: CONSUMER only

**Description**: Consumer generates a one-time use voucher token for a specific promotion at a store. This token should be encoded into a QR code on the frontend.

**Request Body**:
```typescript
{
  "promotionId": 1,        // The voucher promotion ID
  "storeId": 5,            // Store where voucher will be redeemed
  "productId": 10          // Optional: specific product for redemption
}
```

**Response**:
```typescript
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT token for QR code
  "userId": 123,
  "userName": "John Doe",
  "redemptionId": 1,
  "promotionId": 1,
  "storeId": 5,
  "productId": 10,
  "status": "PENDING"
}
```

**Frontend Implementation**:
1. Consumer clicks on product with voucher
2. Call this endpoint to generate token
3. Encode the `token` into a QR code (use any lightweight QR library like `qrcode` or `react-qr-code`)
4. Display QR code to consumer

**Error Cases**:
- `400 Bad Request`: Promotion not found, not a voucher type, or already redeemed
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: User is not a consumer

### 2. Verify Voucher Token (Retailer)

**Endpoint**: `POST /promotions/voucher/verify`

**Role**: RETAILER, ADMIN

**Description**: Retailer scans the consumer's QR code and verifies the voucher. Returns consumer information for qualification check.

**Request Body**:
```typescript
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Token from consumer's QR code
}
```

**Response**:
```typescript
{
  "valid": true,
  "userId": 123,
  "userName": "John Doe",
  "subscriptionTier": "PRO",      // Consumer's subscription tier
  "redemptionId": 1,
  "promotionTitle": "Holiday Gift Voucher",
  "voucherValue": 50,
  "storeId": 5,
  "productId": 10,
  "status": "VERIFIED"
}
```

**If Invalid**:
```typescript
{
  "valid": false,
  "userId": 123,
  "userName": "John Doe",
  "subscriptionTier": "UNKNOWN",
  "redemptionId": 1,
  "promotionTitle": "Holiday Gift Voucher",
  "voucherValue": 50,
  "storeId": 5,
  "status": "REDEEMED",
  "message": "Voucher already redeemed"
}
```

**Frontend Implementation**:
1. Retailer scans QR code to extract token
2. Call this endpoint with the token
3. Display consumer info (name, subscription tier, qualified status)
4. Show "Confirm" button if `valid: true`

**Error Cases**:
- `400 Bad Request`: Invalid voucher token or redemption not found
- `401 Unauthorized`: Invalid or missing JWT token, or expired voucher token
- `403 Forbidden`: User is not a retailer, or doesn't own the store

### 3. Confirm Voucher Redemption (Retailer)

**Endpoint**: `POST /promotions/voucher/confirm`

**Role**: RETAILER, ADMIN

**Description**: After verifying consumer qualification, retailer confirms the redemption. This marks the voucher as REDEEMED and makes it unusable.

**Request Body**:
```typescript
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Same token from QR code
}
```

**Response**:
```typescript
{
  "message": "Voucher redeemed successfully",
  "redemptionId": 1
}
```

**Frontend Implementation**:
1. After successful verification, show "Confirm" button
2. When retailer clicks confirm, call this endpoint
3. Display success message
4. The voucher is now consumed and cannot be used again

**Error Cases**:
- `400 Bad Request`: Redemption not found or already redeemed
- `401 Unauthorized`: Invalid or expired voucher token
- `403 Forbidden`: Voucher must be verified first, or retailer doesn't own the store

## Consumer Flow (Frontend)

```
1. Consumer browses products with vouchers
   ↓
2. Consumer clicks on product with voucher
   ↓
3. Frontend calls POST /promotions/voucher/generate
   {
     promotionId: <voucher_promotion_id>,
     storeId: <store_id>,
     productId: <optional_product_id>
   }
   ↓
4. Backend returns token with consumer info
   ↓
5. Frontend encodes token into QR code
   ↓
6. Consumer shows QR code to retailer
```

### Example Frontend Code (Consumer)

```typescript
// When consumer clicks on product with voucher
const generateVoucherQR = async (promotionId: number, storeId: number, productId?: number) => {
  try {
    const response = await fetch('/api/promotions/voucher/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${consumerToken}`
      },
      body: JSON.stringify({ promotionId, storeId, productId })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Use any QR library to generate QR code from data.token
      // Example: <QRCode value={data.token} />
      setQRCodeToken(data.token);
      setConsumerInfo({
        name: data.userName,
        promotionId: data.promotionId
      });
    } else {
      // Handle error (already redeemed, not a voucher, etc.)
      showError(data.message);
    }
  } catch (error) {
    console.error('Error generating voucher:', error);
  }
};
```

## Retailer Flow (Frontend)

```
1. Retailer opens voucher scanner
   ↓
2. Retailer scans consumer's QR code
   ↓
3. Frontend extracts token from QR code
   ↓
4. Frontend calls POST /promotions/voucher/verify
   { token: <extracted_token> }
   ↓
5. Backend returns consumer info and qualification status
   ↓
6. Frontend displays:
   - Consumer name
   - Subscription tier
   - Qualified/Not Qualified label
   - Voucher details (value, promotion title)
   ↓
7. If qualified (valid: true), show "Confirm" button
   ↓
8. Retailer reviews and clicks "Confirm"
   ↓
9. Frontend calls POST /promotions/voucher/confirm
   { token: <same_token> }
   ↓
10. Backend marks voucher as REDEEMED
   ↓
11. Frontend shows success message
```

### Example Frontend Code (Retailer)

```typescript
// After scanning QR code
const verifyVoucher = async (token: string) => {
  try {
    const response = await fetch('/api/promotions/voucher/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${retailerToken}`
      },
      body: JSON.stringify({ token })
    });

    const data = await response.json();
    
    if (response.ok) {
      setConsumerInfo({
        name: data.userName,
        tier: data.subscriptionTier,
        qualified: data.valid,
        promotionTitle: data.promotionTitle,
        voucherValue: data.voucherValue,
        message: data.message
      });
      
      if (data.valid) {
        setShowConfirmButton(true);
        setRedemptionToken(token);
      }
    } else {
      showError('Invalid or expired voucher');
    }
  } catch (error) {
    console.error('Error verifying voucher:', error);
  }
};

const confirmRedemption = async () => {
  try {
    const response = await fetch('/api/promotions/voucher/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${retailerToken}`
      },
      body: JSON.stringify({ token: redemptionToken })
    });

    const data = await response.json();
    
    if (response.ok) {
      showSuccess('Voucher redeemed successfully!');
      setShowConfirmButton(false);
    } else {
      showError(data.message);
    }
  } catch (error) {
    console.error('Error confirming voucher:', error);
  }
};
```

## Security Features

1. **JWT Authentication**: Uses existing JWT infrastructure for token generation and verification
2. **Token Expiration**: Voucher tokens expire after 1 hour (configurable)
3. **Role-Based Access**: Consumers can only generate tokens, retailers can only verify/confirm
4. **Store Ownership Validation**: Retailers can only verify/confirm vouchers for their own stores
5. **One-Time Use Enforcement**: Database constraint prevents multiple redemptions
6. **Status Tracking**: PENDING → VERIFIED → REDEEMED flow ensures proper workflow

## Performance & Resource Optimization

- **No External Dependencies**: Uses existing JWT and Prisma
- **Lightweight Tokens**: JWT tokens are small and efficient
- **Database Indexes**: Optimized queries with proper indexes
- **Minimal RAM Usage**: No in-memory caching required
- **Simple API**: Three endpoints, straightforward logic
- **No QR Generation on Backend**: QR code generation happens on frontend

## Database Migration

To apply the database schema changes, run the following SQL script (located in `prisma/migrations/add_voucher_redemption.sql`):

```bash
# Connect to your PostgreSQL database and run:
psql -U your_username -d your_database -f prisma/migrations/add_voucher_redemption.sql

# Or use a database client to execute the SQL directly
```

Alternatively, if you have proper database permissions:

```bash
npx prisma migrate dev --name add_voucher_redemption
```

## Testing

### Test Consumer Flow

1. Login as a consumer
2. Create a voucher promotion (or use existing one)
3. Call `POST /promotions/voucher/generate` with valid promotionId and storeId
4. Verify you receive a token
5. Try generating again with the same details (should work, creates new PENDING)

### Test Retailer Flow

1. Get the token from consumer flow
2. Login as a retailer who owns the store
3. Call `POST /promotions/voucher/verify` with the token
4. Verify consumer info is returned with `valid: true`
5. Call `POST /promotions/voucher/confirm` with the token
6. Verify redemption is successful
7. Try verifying the same token again (should return `valid: false` with "already redeemed" message)

### Test Security

1. Try verifying a voucher for a store you don't own (should return 403)
2. Try confirming without verifying first (should return 403)
3. Try using an expired token (should return 401)
4. Try generating a voucher for a non-voucher promotion (should return 400)

## Troubleshooting

### "Voucher already redeemed"
- The consumer has already used this voucher at this store
- Each consumer can only redeem a voucher once per store

### "You do not have permission to verify vouchers for this store"
- The retailer doesn't own the store specified in the voucher
- Ensure the logged-in retailer is the owner of the store

### "Voucher must be verified before confirmation"
- The retailer tried to confirm without verifying first
- Call the `/verify` endpoint before `/confirm`

### "Invalid or expired voucher token"
- The token has expired (default: 1 hour)
- The token is malformed or tampered with
- Consumer needs to generate a new token

## Future Enhancements (Optional)

1. **Expiration Notifications**: Notify consumers when vouchers are about to expire
2. **Usage Statistics**: Track redemption rates and popular vouchers
3. **Batch Redemption**: Allow multiple vouchers in one transaction
4. **Refund Mechanism**: Allow admins to reverse redemptions if needed
5. **QR Code Caching**: Cache generated QR codes on frontend for offline use

## Architecture Benefits

✅ **Lightweight**: No heavy dependencies, uses existing infrastructure  
✅ **Secure**: JWT-based authentication, role-based access control  
✅ **Simple**: Three endpoints, clear flow, easy to understand  
✅ **Scalable**: Database-backed, indexed queries, efficient  
✅ **Resource-Efficient**: Optimized for 512MB RAM hosting  
✅ **Frontend-Agnostic**: Works with any QR library or framework  

## Notes

- **Other Deal Types Unchanged**: This system only affects VOUCHER type promotions. All other deal types (PERCENTAGE_DISCOUNT, FIXED_DISCOUNT, BOGO, BUNDLE, QUANTITY_DISCOUNT) remain unchanged and function normally.
  
- **QR Code Generation**: The backend only generates JWT tokens. The frontend is responsible for encoding these tokens into QR codes using any lightweight QR code library.

- **Token Security**: The voucher token contains the redemption ID and consumer information. It's signed with your JWT_SECRET and expires after 1 hour for security.

- **Multiple Products**: If a voucher applies to multiple products, the consumer can optionally specify which product they want to redeem it for using the `productId` field. If omitted, the voucher can be used for any product in the promotion.

