export async function POST(request) {
  // Use API_URL for server-side, fallback to NEXT_PUBLIC_API_URL, then hardcoded Railway URL
  const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://plexarisgpt-production.up.railway.app';

  try {
    const body = await request.json();

    const response = await fetch(`${backendUrl}/api/rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: body.query,
        userId: body.userId,
        supplierId: body.supplierId,
        cartItems: body.cartItems || [],
        sessionId: body.sessionId || null,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, errorText);
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error in RAG endpoint:', error.message, 'Backend URL:', backendUrl);
    return Response.json(
      {
        error: 'Failed to process query',
        response: 'Sorry, I encountered an error. Please try again.',
        products: [],
      },
      { status: 500 }
    );
  }
}
