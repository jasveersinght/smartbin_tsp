class RouteManager {
    constructor(map) {
        this.map = map;
        this.routeControl = null;
        this.currentRoute = null;
        this.routePanel = null;
        this.initializeRoutePanel();
    }

    initializeRoutePanel() {
        this.routePanel = L.control({ position: 'topright' });

        this.routePanel.onAdd = () => {
            const div = L.DomUtil.create('div', 'route-panel hidden');
            div.innerHTML = `
                <div class="bg-white p-4 rounded-lg shadow-lg w-64">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-bold text-lg">Route to <span id="routeTo">Destination</span></h3>
                        <button id="closeRoutePanel" class="text-gray-500 hover:text-gray-700">
                            ✕
                        </button>
                    </div>
                    <div class="route-stats grid grid-cols-2 gap-2 mb-3">
                        <div class="bg-blue-50 p-2 rounded">
                            <div class="text-2xl font-bold text-blue-600" id="routeDistance">-</div>
                            <div class="text-xs text-gray-500">Distance</div>
                        </div>
                        <div class="bg-green-50 p-2 rounded">
                            <div class="text-2xl font-bold text-green-600" id="routeTime">-</div>
                            <div class="text-xs text-gray-500">Duration</div>
                        </div>
                        <div class="bg-purple-50 p-2 rounded">
                            <div class="text-sm font-semibold text-purple-600" id="routeArrival">-</div>
                            <div class="text-xs text-gray-500">Arrival</div>
                        </div>
                        <div class="bg-yellow-50 p-2 rounded">
                            <div class="text-sm font-semibold text-yellow-600" id="routeEta">-</div>
                            <div class="text-xs text-gray-500">ETA</div>
                        </div>
                    </div>
                    <div class="route-actions flex space-x-2 mb-3">
                        <button id="printRouteBtn" class="flex-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm hover:bg-blue-200 transition">
                            Print
                        </button>
                        <button id="shareRouteBtn" class="flex-1 bg-green-100 text-green-700 px-2 py-1 rounded text-sm hover:bg-green-200 transition">
                            Share
                        </button>
                        <button id="clearRouteBtn" class="flex-1 bg-red-100 text-red-700 px-2 py-1 rounded text-sm hover:bg-red-200 transition">
                            Clear
                        </button>
                    </div>
                    <div class="directions max-h-40 overflow-y-auto">
                        <h4 class="font-medium text-sm mb-1">Directions:</h4>
                        <div id="routeSteps" class="text-sm space-y-1"></div>
                    </div>
                </div>
            `;

            L.DomEvent.on(div.querySelector('#closeRoutePanel'), 'click', () => this.clearRoute());
            L.DomEvent.on(div.querySelector('#printRouteBtn'), 'click', () => this.printRoute());
            L.DomEvent.on(div.querySelector('#shareRouteBtn'), 'click', () => this.shareRoute());
            L.DomEvent.on(div.querySelector('#clearRouteBtn'), 'click', () => this.clearRoute());

            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            return div;
        };

        this.routePanel.addTo(this.map);
    }

    showLoading(show = true) {
        const loadingDiv = document.getElementById('routeLoading');
        if (loadingDiv) {
            loadingDiv.classList.toggle('hidden', !show);
            loadingDiv.style.display = show ? 'flex' : 'none';
        }
    }

    showRoutePanel(show = true) {
        const panel = document.querySelector('.route-panel');
        if (panel) {
            panel.classList.toggle('hidden', !show);
        }
    }

    async findRouteToBin(bin, startCoords) {
        if (!this.map || !bin) {
            return;
        }

        this.showLoading(true);

        try {
            this.clearRoute();

            let startLatLng;
            if (Array.isArray(startCoords) && startCoords.length === 2) {
                startLatLng = L.latLng(startCoords[0], startCoords[1]);
            } else if (navigator.geolocation) {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                startLatLng = L.latLng(position.coords.latitude, position.coords.longitude);
            } else {
                startLatLng = this.map.getCenter();
            }

            const endLatLng = L.latLng(bin.location_lat, bin.location_lng);

            this.routeControl = L.Routing.control({
                waypoints: [startLatLng, endLatLng],
                routeWhileDragging: false,
                show: false,
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: true,
                showAlternatives: false,
                lineOptions: {
                    styles: [{ color: '#3b82f6', opacity: 0.9, weight: 6 }]
                },
                createMarker: (i, waypoint) => this.createRouteMarker(i, waypoint, bin),
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1',
                    profile: 'driving'
                }),
                formatter: new L.Routing.Formatter({
                    language: 'en',
                    unit: 'metric',
                    roundingSensitivity: 1
                })
            });

            this.routeControl.on('routesfound', (e) => this.onRoutesFound(e, bin));
            this.routeControl.on('routingerror', (e) => this.onRouteError(e));

            this.routeControl.addTo(this.map);
        } catch (error) {
            console.error('Error finding route:', error);
            this.showLoading(false);
            alert('Could not calculate route. Please make sure location services are enabled and try again.');
        }
    }

    createRouteMarker(i, waypoint, bin) {
        if (i === 0) {
            return L.marker(waypoint.latLng, {
                icon: L.divIcon({
                    className: 'start-marker',
                    html: '📍',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            }).bindPopup('Your Location');
        }

        const color = bin.fill_level <= 32 ? '#22c55e'
                    : bin.fill_level <= 65 ? '#facc15'
                    : bin.fill_level <= 89 ? '#f97316'
                    : '#dc2626';
        return L.marker(waypoint.latLng, {
            icon: L.divIcon({
                className: 'destination-marker',
                html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).bindPopup(`<b>${bin.area || 'Bin'}</b><br>Fill Level: ${bin.fill_level}%`);
    }

    onRoutesFound(e, bin) {
        this.showLoading(false);

        const route = e.routes[0];
        this.currentRoute = route;

        document.getElementById('routeTo').textContent = bin.area || 'Destination';
        document.getElementById('routeDistance').textContent = this.formatDistance(route.summary.totalDistance);
        document.getElementById('routeTime').textContent = this.formatDuration(route.summary.totalTime);

        const now = new Date();
        const arrivalTime = new Date(now.getTime() + route.summary.totalTime * 1000);
        document.getElementById('routeArrival').textContent = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('routeEta').textContent = this.formatEta(route.summary.totalTime);

        const stepsContainer = document.getElementById('routeSteps');
        stepsContainer.innerHTML = '';

        route.instructions.forEach((instruction) => {
            const step = document.createElement('div');
            step.className = 'route-step flex items-start';
            step.innerHTML = `
                <span class="text-gray-500 mr-2">${instruction.distance > 0 ? instruction.distance + 'm' : ''}</span>
                <span>${instruction.text}</span>
            `;
            stepsContainer.appendChild(step);
        });

        this.showRoutePanel(true);

        const latlngs = route.coordinates.map((coord) => [coord.lat, coord.lng]);
        this.map.fitBounds(latlngs, { padding: [50, 50] });
    }

    onRouteError(e) {
        this.showLoading(false);
        console.error('Routing error:', e);
        alert('Could not find a route. Please try a different destination.');
    }

    clearRoute() {
        if (this.routeControl) {
            this.map.removeControl(this.routeControl);
            this.routeControl = null;
        }
        this.currentRoute = null;
        this.showRoutePanel(false);
        this.showLoading(false);
    }

    printRoute() {
        if (!this.currentRoute) return;
        
        const printWindow = window.open('', '_blank');
        const routeInfo = `
            <h1>Route to ${document.getElementById('routeTo').textContent}</h1>
            <p><strong>Distance:</strong> ${document.getElementById('routeDistance').textContent}</p>
            <p><strong>Duration:</strong> ${document.getElementById('routeTime').textContent}</p>
            <p><strong>Arrival:</strong> ${document.getElementById('routeArrival').textContent}</p>
            <h2>Directions:</h2>
            <ol>
                ${Array.from(document.querySelectorAll('#routeSteps .route-step')).map(step => 
                    `<li>${step.textContent.trim()}</li>`
                ).join('')}
            </ol>
        `;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Route Details</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                    h1 { color: #2563eb; }
                    ol { padding-left: 20px; }
                    li { margin-bottom: 8px; }
                </style>
            </head>
            <body>
                ${routeInfo}
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
    
    shareRoute() {
        if (!this.currentRoute) return;
        
        const shareData = {
            title: `Route to ${document.getElementById('routeTo').textContent}`,
            text: `Check out this route to ${document.getElementById('routeTo').textContent}`,
            url: window.location.href
        };
        
        if (navigator.share) {
            navigator.share(shareData)
                .catch(error => console.log('Error sharing:', error));
        } else {
            // Fallback for browsers that don't support Web Share API
            const text = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
            prompt('Copy this link to share:', text);
        }
    }
    
    formatDistance(meters) {
        return meters > 1000 
            ? `${(meters / 1000).toFixed(1)} km` 
            : `${Math.round(meters)} m`;
    }
    
    formatDuration(seconds) {
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 
            ? `${hours}h ${remainingMinutes}m` 
            : `${hours}h`;
    }
    
    formatEta(seconds) {
        const now = new Date();
        const eta = new Date(now.getTime() + seconds * 1000);
        return eta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}
