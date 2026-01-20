# Xendit Backend Integration for Supabase

## 1. Setup Supabase Functions
If you haven't already, install the Supabase CLI and login.
```bash
npm install -g supabase
supabase login
supabase init
```

## 2. Deploy Functions
You need to deploy two functions: `create-payment` and `xendit-webhook`.

### create-payment
Handles the creation of the payment link (Invoice).
```bash
supabase functions new create-payment
# (Copy code provided to supabase/functions/create-payment/index.ts)
supabase functions deploy create-payment
```

### xendit-webhook
Handles the SUCCESS callback from Xendit to update the user's balance.
**IMPORTANT**: This function must be publicly accessible so Xendit can call it.
```bash
supabase functions new xendit-webhook
# (Copy code provided to supabase/functions/xendit-webhook/index.ts)
supabase functions deploy xendit-webhook --no-verify-jwt
```

## 3. Configuration

### Secrets
You must set these secrets in your Supabase Dashboard (> Settings > Edge Functions):
- `XENDIT_SECRET_KEY`: Your Xendit Secret Key.
- `SUPABASE_URL`: (Usually Auto-set)
- `SUPABASE_SERVICE_ROLE_KEY`: (Required for the webhook to update balances).

```bash
supabase secrets set XENDIT_SECRET_KEY=your_key_here
```

### Xendit Dashboard Setup
1. Go to **Xendit Dashboard** > Settings > Callbacks.
2. In the **"Invoices"** section (or Payment Status), set the Webhook URL to your deployed function URL.
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/xendit-webhook`
3. Click "Test" to verify connectivity (it might fail if logic expects specific payload, but 200 OK is good).

---
**Note on API Version**: We are using the **Xendit Invoices API** (`v2/invoices`). This is the "Redirect to Payment Page" method. The "Payment Request" API (`v2/payment_requests`) mentioned in documentation is for building custom checkout flows, which is more complex. The functions provided here use Invoices for simplicity and security.

## 5. Webhook
To handle success, you need a webhook function that updates the `wallet_transactions` status to 'success' and `profiles` balance.
