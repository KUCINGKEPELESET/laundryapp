import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Setup Supabase Client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

Deno.serve(async (req) => {
  // Webhook Verification (Optional but recommended: Verify X-Callback-Token if set)
  // const token = req.headers.get('x-callback-token');
  // if (token !== Deno.env.get('XENDIT_CALLBACK_TOKEN')) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await req.json();
    console.log("WEBHOOK_PAYLOAD:", JSON.stringify(body));

    // Xendit Invoice Callback Payload
    // Status can be 'PAID' or 'EXPIRED'
    const { status, external_id, amount, paid_amount, payer_email } = body;

    // Handle Xendit Dashboard "Test" button
    if (!external_id.startsWith('TX-')) {
        console.log("Ignoring Test/Invalid External ID:", external_id);
        return new Response(JSON.stringify({ message: "Test Event Ignored" }), {
          headers: { "Content-Type": "application/json" },
        });
    }

    if (status === 'PAID') {
       const parts = external_id.split('-');
       // Format: TX-{TIMESTAMP}-{USER_ID}
       // Slice from index 2 to get the ID parts, then join them back
       const userId = parts.slice(2).join('-'); 
       console.log("Parsed User ID:", userId);

       if (!userId) throw new Error("Invalid External ID format: " + external_id);

       const finalAmount = Number(paid_amount || amount);

       const { description } = body;
       // Quick Hack: Extract type from description if possible, or default to TOPUP.
       // We set description as `${transactionType} for user...` in create-payment.
       let txType = 'TOPUP';
       if (description && description.includes('ORDER_PAYMENT')) {
           txType = 'ORDER_PAYMENT';
       }

       // 1. Log Transaction
       const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
            user_id: userId,
            amount: finalAmount,
            type: txType, // Uppercase TOPUP or ORDER_PAYMENT
            status: 'success',
            external_id: external_id,
            description: description || 'Xendit Payment Received'
        });

       if (txError) console.error("Tx Insert Error:", txError);

       // 2. Update Profile Balance (ONLY IF TOPUP)
       if (txType === 'TOPUP') {
            const { data: profile, error: fetchError } = await supabase.from('profiles').select('balance').eq('id', userId).single();
            
            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'not found'
                console.error("Profile Fetch Error:", fetchError);
            }

            const currentBalance = profile ? Number(profile.balance) : 0;
            const newBalance = currentBalance + finalAmount;

            console.log(`Updating Balance for ${userId}: ${currentBalance} -> ${newBalance}`);

            const upsertData: { id: string; balance: number; updated_at: string; email?: string; full_name?: string } = { 
                    id: userId, 
                    balance: newBalance,
                    updated_at: new Date().toISOString()
            };
            // Only add email if we have it and it's likely a new record 
            if (!profile && payer_email) {
                upsertData.email = payer_email;
                upsertData.full_name = payer_email.split('@')[0]; 
            }

            const { error: balError } = await supabase
                .from('profiles')
                .upsert(upsertData)
                .select();

            if (balError) console.error("Balance Update/Upsert Error:", balError);
       } else {
           console.log("Skipping Balance Update for Order Payment");
       }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }
})
