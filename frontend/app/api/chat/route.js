// Chat API routes - forward to FastAPI backend

const getBackendUrl = () => process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://plexarisgpt-production.up.railway.app';

export async function GET(request) {
  const backendUrl = getBackendUrl();
  return new Response(
    JSON.stringify({
      message: 'Chat API routes are handled by FastAPI backend',
      baseUrl: `${backendUrl}/api/chat`
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(request) {
  const backendUrl = getBackendUrl();
  try {
    const body = await request.json();
    const response = await fetch(`${backendUrl}/api/chat/sessions`, {
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
