const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

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

// Helper function to parse JSON body
function parseBody(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            callback(null, JSON.parse(body));
        } catch (e) {
            callback(e);
        }
    });
}

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// TSP Round-trip Nearest Neighbor algorithm with depot
function optimizeRouteNearestNeighbor(bins) {
    if (bins.length === 0) return { route: [], totalDistance: 0 };

    // Chennai Center Depot
    const depot = { location_lat: 13.0827, location_lng: 80.2707, area: 'Central Depot - Start/End' };

    const route = [];
    const unvisited = [...bins];

    // Start at depot
    route.push({ lat: depot.location_lat, lng: depot.location_lng, area: depot.area });

    let current = depot;
    let totalDistance = 0;

    while (unvisited.length > 0) {
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
            const distance = calculateDistance(
                current.location_lat,
                current.location_lng,
                unvisited[i].location_lat,
                unvisited[i].location_lng
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

    // Return to depot (round-trip)
    const distanceBackToDepot = calculateDistance(
        current.location_lat,
        current.location_lng,
        depot.location_lat,
        depot.location_lng
    );
    totalDistance += distanceBackToDepot;
    route.push({ lat: depot.location_lat, lng: depot.location_lng, area: 'Central Depot - End' });

    return { route, totalDistance };
}


// Function to serve static files
function serveStaticFile(res, filePath, contentType, responseCode = 200) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if(err.code === 'ENOENT') {
                // Page not found
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404 Not Found', 'utf-8');
            } else {
                // Server error
                res.writeHead(500);
                res.end('Server Error: ' + err.code);
            }
        } else {
            // Success
            res.writeHead(responseCode, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// Create HTTP server
const server = http.createServer((req, res) => {
    console.log(`Request: ${req.method} ${req.url}`);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // Handle API endpoints
    if (req.url === '/api/bins' && req.method === 'GET') {
        console.log('Handling /api/bins request (Mock Data)');
        sendJSON(res, 200, mockBins);
        return;
    }

    if (req.url === '/api/bins' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err) {
                sendJSON(res, 400, { error: 'Invalid JSON' });
                return;
            }

            const parsedLat = parseFloat(data.location_lat);
            const parsedLng = parseFloat(data.location_lng);
            const parsedFill = parseInt(data.fill_level, 10);
            const area = typeof data.area === 'string' ? data.area.trim() : '';

            if (
                Number.isNaN(parsedLat) ||
                Number.isNaN(parsedLng) ||
                Number.isNaN(parsedFill) ||
                !area
            ) {
                sendJSON(res, 400, { error: 'Missing or invalid fields' });
                return;
            }

            const sanitizedFill = Math.min(100, Math.max(0, parsedFill));
            const newBin = {
                id: mockBins.length + 1,
                location_lat: parsedLat,
                location_lng: parsedLng,
                area,
                fill_level: sanitizedFill
            };

            mockBins.push(newBin);
            sendJSON(res, 201, newBin);
        });
        return;
    }

    if (req.url.startsWith('/api/bins/') && req.method === 'DELETE') {
        const segments = req.url.split('/');
        const idSegment = segments[3];
        const binId = parseInt(idSegment, 10);

        if (!idSegment || Number.isNaN(binId)) {
            sendJSON(res, 400, { error: 'Invalid bin id' });
            return;
        }

        const index = mockBins.findIndex(bin => bin.id === binId);
        if (index === -1) {
            sendJSON(res, 404, { error: 'Bin not found' });
            return;
        }

        mockBins.splice(index, 1);
        sendJSON(res, 200, { message: 'Bin collected successfully' });
        return;
    }

    if (req.url === '/api/routes/optimize' && req.method === 'GET') {
        const highFillBins = mockBins.filter(bin => bin.fill_level > 70);
        const optimizedRoute = optimizeRouteNearestNeighbor(highFillBins);
        sendJSON(res, 200, optimizedRoute);
        return;
    }

    // Serve static files for non-API requests
    const parsedUrl = url.parse(req.url, true);
    let pathname = path.join(__dirname, parsedUrl.pathname === '/' ? '/dashboard-new.html' : parsedUrl.pathname);
    const extname = String(path.extname(pathname)).toLowerCase();
    
    // MIME types mapping
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };

    // Default content type
    let contentType = mimeTypes[extname] || 'application/octet-stream';

    // Otherwise serve static files
    serveStaticFile(res, pathname, contentType);
});

// Start server
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/bins`);
    console.log('Using mock data (no database required)');
});
