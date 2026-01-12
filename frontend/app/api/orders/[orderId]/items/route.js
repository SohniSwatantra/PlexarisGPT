export async function GET(request, { params }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://plexarisgpt-production.up.railway.app';
    const { orderId } = params;

    // First get order items
    const itemsRes = await fetch(`${backendUrl}/api/orders/${orderId}/items`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!itemsRes.ok) {
      return Response.json([]);
    }

    let items = await itemsRes.json();
    
    // If items array, fetch product details for each
    if (Array.isArray(items)) {
      items = await Promise.all(
        items.map(async (item) => {
          try {
            // If product_id exists, fetch product details
            if (item.product_id) {
              const prodRes = await fetch(`${backendUrl}/api/products?id=${item.product_id}`, {
                headers: { 'Content-Type': 'application/json' },
              });
              if (prodRes.ok) {
                const prodData = await prodRes.json();
                const product = prodData.products?.[0] || prodData.product;
                if (product) {
                  return {
                    ...item,
                    name: product.name || item.name,
                    price: product.price || item.price,
                  };
                }
              }
            }
            return item;
          } catch (e) {
            return item;
          }
        })
      );
    }

    return Response.json(items);
  } catch (error) {
    console.error('Error fetching order items:', error);
    return Response.json([], { status: 500 });
  }
}
