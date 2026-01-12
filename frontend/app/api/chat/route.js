// Chat API routes - forward to FastAPI backend

export async function GET(request) {
  // Rewrite will handle this, but return helpful message if accessed directly
  return new Response(
    JSON.stringify({
      message: 'Chat API routes are handled by FastAPI backend',
      baseUrl: 'http://localhost:8000/api/chat'
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(request) {
  // This should be handled by the rewrite, but just in case
  try {
    const body = await request.json();
    const response = await fetch('http://localhost:8000/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
