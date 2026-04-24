// Mock data for bins
const mockBins = [
    { id: 1, location_lat: 13.0423, location_lng: 80.2337, area: 'T. Nagar', fill_level: 35 },
    { id: 2, location_lat: 13.0338, location_lng: 80.2667, area: 'Mylapore', fill_level: 82 },
    { id: 3, location_lat: 13.0007, location_lng: 80.2550, area: 'Adyar', fill_level: 91 },
    { id: 4, location_lat: 13.0878, location_lng: 80.2120, area: 'Anna Nagar', fill_level: 68 },
    { id: 5, location_lat: 13.0560, location_lng: 80.2496, area: 'Nungambakkam', fill_level: 54 },
    { id: 6, location_lat: 12.9801, location_lng: 80.2192, area: 'Velachery', fill_level: 77 },
    { id: 7, location_lat: 12.9983, location_lng: 80.2707, area: 'Besant Nagar', fill_level: 63 },
    { id: 8, location_lat: 13.0102, location_lng: 80.2209, area: 'Saidapet', fill_level: 48 },
    { id: 9, location_lat: 12.9240, location_lng: 80.1275, area: 'Tambaram', fill_level: 72 },
    { id: 10, location_lat: 13.1143, location_lng: 80.1548, area: 'Ambattur', fill_level: 58 }
];

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// TSP Nearest Neighbor algorithm
function optimizeRouteNearestNeighbor(bins) {
    if (bins.length === 0) return { route: [], totalDistance: 0 };

    const depot = { location_lat: 13.0827, location_lng: 80.2707, area: 'Central Depot - Start/End' };
    const route = [];
    const unvisited = [...bins];

    route.push({ lat: depot.location_lat, lng: depot.location_lng, area: depot.area });

    let current = depot;
    let totalDistance = 0;

    while (unvisited.length > 0) {
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
            const distance = calculateDistance(
                current.location_lat, current.location_lng,
                unvisited[i].location_lat, unvisited[i].location_lng
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }

        current = unvisited.splice(nearestIndex, 1)[0];
        route.push({ lat: current.location_lat, lng: current.location_lng, area: current.area });
        totalDistance += nearestDistance;
    }

    const distanceBackToDepot = calculateDistance(
        current.location_lat, current.location_lng,
        depot.location_lat, depot.location_lng
    );
    totalDistance += distanceBackToDepot;
    route.push({ lat: depot.location_lat, lng: depot.location_lng, area: 'Central Depot - End' });

    return { route, totalDistance };
}

function sendJSON(res, statusCode, data) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(statusCode).json(data);
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(e); }
        });
    });
}

module.exports = async (req, res) => {
    const { method, url } = req;

    // CORS preflight
    if (method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    // GET /api/bins
    if (url === '/api/bins' && method === 'GET') {
        return sendJSON(res, 200, mockBins);
    }

    // POST /api/bins
    if (url === '/api/bins' && method === 'POST') {
        try {
            const data = await parseBody(req);
            const parsedLat = parseFloat(data.location_lat);
            const parsedLng = parseFloat(data.location_lng);
            const parsedFill = parseInt(data.fill_level, 10);
            const area = typeof data.area === 'string' ? data.area.trim() : '';

            if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedFill) || !area) {
                return sendJSON(res, 400, { error: 'Missing or invalid fields' });
            }

            const newBin = {
                id: mockBins.length + 1,
                location_lat: parsedLat,
                location_lng: parsedLng,
                area,
                fill_level: Math.min(100, Math.max(0, parsedFill))
            };
            mockBins.push(newBin);
            return sendJSON(res, 201, newBin);
        } catch (e) {
            return sendJSON(res, 400, { error: 'Invalid JSON' });
        }
    }

    // DELETE /api/bins/:id
    if (url.startsWith('/api/bins/') && method === 'DELETE') {
        const segments = url.split('/');
        const binId = parseInt(segments[3], 10);

        if (isNaN(binId)) {
            return sendJSON(res, 400, { error: 'Invalid bin id' });
        }

        const index = mockBins.findIndex(bin => bin.id === binId);
        if (index === -1) {
            return sendJSON(res, 404, { error: 'Bin not found' });
        }

        mockBins.splice(index, 1);
        return sendJSON(res, 200, { message: 'Bin collected successfully' });
    }

    // GET /api/routes/optimize
    if (url === '/api/routes/optimize' && method === 'GET') {
        const highFillBins = mockBins.filter(bin => bin.fill_level > 70);
        const optimizedRoute = optimizeRouteNearestNeighbor(highFillBins);
        return sendJSON(res, 200, optimizedRoute);
    }

    // 404 fallback for unknown API routes
    return sendJSON(res, 404, { error: 'Endpoint not found' });
};
