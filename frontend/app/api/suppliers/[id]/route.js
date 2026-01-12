export async function GET(request, { params }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const { id } = params;

    const response = await fetch(`${backendUrl}/api/suppliers/${id}`, {
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
    console.error('Error fetching supplier:', error);
    return Response.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}
