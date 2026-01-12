export async function POST(request) {
  try {
    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error in RAG endpoint:', error);
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
