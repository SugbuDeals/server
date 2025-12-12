# Voucher Redemption Quick Start

## Database Setup

**Important**: You need to run the SQL migration to create the voucher redemption table.

```bash
# Option 1: Run SQL directly (recommended for hosted databases)
psql -U your_username -d your_database -f prisma/migrations/add_voucher_redemption.sql

# Option 2: Use Prisma (requires database superuser permissions)
npx prisma migrate dev --name add_voucher_redemption
```

The SQL file is located at: `prisma/migrations/add_voucher_redemption.sql`

## API Quick Reference

### 1. Consumer: Generate Voucher QR Token

```bash
POST /promotions/voucher/generate
Authorization: Bearer <consumer_token>

{
  "promotionId": 1,
  "storeId": 5,
  "productId": 10  // optional
}

Response:
{
  "token": "eyJhbG...",  // Encode this into QR code
  "userId": 123,
  "userName": "John Doe",
  "redemptionId": 1,
  "promotionId": 1,
  "storeId": 5,
  "status": "PENDING"
}
```

### 2. Retailer: Verify Voucher (Scan QR)

```bash
POST /promotions/voucher/verify
Authorization: Bearer <retailer_token>

{
  "token": "eyJhbG..."  // Token from scanned QR code
}

Response:
{
  "valid": true,
  "userId": 123,
  "userName": "John Doe",
  "subscriptionTier": "PRO",
  "redemptionId": 1,
  "promotionTitle": "Holiday Voucher",
  "voucherValue": 50,
  "storeId": 5,
  "status": "VERIFIED"
}
```

### 3. Retailer: Confirm Redemption

```bash
POST /promotions/voucher/confirm
Authorization: Bearer <retailer_token>

{
  "token": "eyJhbG..."  // Same token from QR code
}

Response:
{
  "message": "Voucher redeemed successfully",
  "redemptionId": 1
}
```

## Frontend Integration

### Consumer Side (React Example)

```typescript
import QRCode from 'react-qr-code';

const VoucherQRDisplay = ({ promotionId, storeId, productId }) => {
  const [qrToken, setQrToken] = useState('');
  
  const generateQR = async () => {
    const response = await fetch('/api/promotions/voucher/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ promotionId, storeId, productId })
    });
    
    const data = await response.json();
    setQrToken(data.token);
  };
  
  return (
    <div>
      <button onClick={generateQR}>Generate Voucher QR</button>
      {qrToken && <QRCode value={qrToken} />}
    </div>
  );
};
```

### Retailer Side (React Example)

```typescript
import QrScanner from 'qr-scanner';

const VoucherScanner = () => {
  const [voucherInfo, setVoucherInfo] = useState(null);
  const [token, setToken] = useState('');
  
  const verifyVoucher = async (scannedToken) => {
    const response = await fetch('/api/promotions/voucher/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${retailerToken}`
      },
      body: JSON.stringify({ token: scannedToken })
    });
    
    const data = await response.json();
    setVoucherInfo(data);
    setToken(scannedToken);
  };
  
  const confirmRedemption = async () => {
    const response = await fetch('/api/promotions/voucher/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${retailerToken}`
      },
      body: JSON.stringify({ token })
    });
    
    if (response.ok) {
      alert('Voucher redeemed successfully!');
    }
  };
  
  return (
    <div>
      <QrScanner
        onDecode={(result) => verifyVoucher(result)}
        onError={(error) => console.log(error?.message)}
      />
      
      {voucherInfo && (
        <div>
          <h3>Consumer: {voucherInfo.userName}</h3>
          <p>Tier: {voucherInfo.subscriptionTier}</p>
          <p>Voucher: ${voucherInfo.voucherValue}</p>
          <p>Status: {voucherInfo.valid ? '✅ Qualified' : '❌ Not Valid'}</p>
          
          {voucherInfo.valid && (
            <button onClick={confirmRedemption}>Confirm Redemption</button>
          )}
        </div>
      )}
    </div>
  );
};
```

## Key Points

✅ **One-Time Use**: Each voucher can only be redeemed once per consumer per store  
✅ **Secure**: JWT-based tokens, role-based access control  
✅ **Lightweight**: No additional dependencies, optimized for 512MB RAM  
✅ **Simple Flow**: Generate → Verify → Confirm  
✅ **Other Deals Unchanged**: Only affects VOUCHER type promotions  

## Troubleshooting

- **"Voucher already redeemed"**: Consumer already used this voucher at this store
- **"Permission denied"**: Retailer doesn't own the store in the voucher
- **"Invalid token"**: Token expired (1 hour) or malformed, regenerate
- **"Must be verified first"**: Call `/verify` before `/confirm`

For detailed documentation, see `VOUCHER_REDEMPTION_SYSTEM.md`

