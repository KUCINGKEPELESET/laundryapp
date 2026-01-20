    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
        throw new Error("Unauthorized: Invalid User Token");
    }

    const { amount, email, redirect_url, type } = await req.json();
    const user_id = user.id; // Securely obtained from Auth Token

    // Default redirect to localhost if not provided (frontend should provide it)
    const successRedirect = redirect_url || 'http://localhost:5173/wallet';
    const failureRedirect = redirect_url || 'http://localhost:5173/wallet';

    // Basic Auth Header for Xendit
    const authHeader = 'Basic ' + btoa(XENDIT_SECRET_KEY + ':');
    
    // Determine Type
    const transactionType = type || 'TOPUP';

    // Create Invoice via Xendit API
    const resp = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        external_id: `TX-${Date.now()}-${user_id}`,
        amount: amount,
        payer_email: email,
        description: `${transactionType} for user ${email}`,
        success_redirect_url: successRedirect,
        failure_redirect_url: failureRedirect,
    // ...
        currency: 'IDR'
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("Xendit Error:", data);
      throw new Error(`Xendit API Error: ${JSON.stringify(data)}`);
    }

    // Return the Invoice URL
    return new Response(
      JSON.stringify({ success: true, invoice_url: data.invoice_url, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Function Error:", error.message);
    // Return 200 even on error so Supabase Client parses the body and we can show the message
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
