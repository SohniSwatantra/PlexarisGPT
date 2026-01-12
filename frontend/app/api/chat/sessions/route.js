// Chat sessions API - forward to FastAPI backend

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, title } = body || {};
    const payload = {
      ...(userId ? { userId } : {}),
      title: title || 'New Chat'
    };
    const response = await fetch('http://localhost:8000/api/chat/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-user-id': userId } : {}),
      },
      body: JSON.stringify(payload)
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit') || '50';
    
    const response = await fetch(
      `http://localhost:8000/api/chat/sessions?userId=${userId}&limit=${limit}`,
      { method: 'GET' }
    );
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
