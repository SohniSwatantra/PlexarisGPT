export async function GET(request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://plexarisgpt-production.up.railway.app';
    
    const response = await fetch(`${backendUrl}/api/suppliers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return Response.json(
      { error: 'Failed to fetch suppliers', suppliers: [] },
      { status: 500 }
    );
  }
}
