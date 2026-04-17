const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Create HTTP server
const server = http.createServer((req, res) => {
    // Log all incoming requests
    const parsedUrl = url.parse(req.url, true);
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight OPTIONS request

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Handle API endpoints
    if (req.url === '/api/bins' && req.method === 'GET') {
        console.log('Returning mock bin data');
        const mockBins = [
            { id: 1, location_lat: 13.0827, location_lng: 80.2707, area: 'T. Nagar', fill_level: 35 },
            { id: 2, location_lat: 13.0674, location_lng: 80.2376, area: 'Mylapore', fill_level: 85 },
            { id: 3, location_lat: 13.0398, location_lng: 80.2401, area: 'Adyar', fill_level: 92 },
            { id: 4, location_lat: 13.0604, location_lng: 80.2496, area: 'Nungambakkam', fill_level: 45 },
            { id: 5, location_lat: 13.0900, location_lng: 80.2100, area: 'Anna Nagar', fill_level: 75 }
        ];
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');
        
        res.end(JSON.stringify(mockBins));
        return;
    }

    // Serve static files
    let filePath = '.' + req.url;
    if (filePath === './' || filePath === './dashboard') {
        filePath = './dashboard-new.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code === 'ENOENT') {
                // Page not found
                fs.readFile('./404.html', (error, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('404 Not Found', 'utf-8');
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`API endpoint: http://localhost:${PORT}/api/bins`);
});
