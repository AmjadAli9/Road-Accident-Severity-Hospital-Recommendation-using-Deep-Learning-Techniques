// Global map variables
let map, userMarker, routeControl;

// Cache for hospital data
let hospitalCache = {
    timestamp: 0,
    data: null,
    location: null
};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache

// Find nearby hospitals
async function findHospital() {
    const hospitalList = document.getElementById('hospitalList');
    hospitalList.innerHTML = '<div class="loading-spinner"></div><p>Finding nearby hospitals...</p>';

    if (!navigator.geolocation) {
        showError('Geolocation not supported by your browser');
        return;
    }

    try {
        const position = await getPosition();
        const { latitude: lat, longitude: lon } = position.coords;
        initMap(lat, lon);

        // Check cache first
        if (isCacheValid(lat, lon)) {
            displayHospitals(hospitalCache.data, lat, lon);
            return;
        }

        // Get data from free APIs
        const hospitals = await fetchHospitals(lat, lon);
        
        // Update cache
        hospitalCache = {
            timestamp: Date.now(),
            data: hospitals,
            location: { lat, lon }
        };

        displayHospitals(hospitals, lat, lon);
    } catch (err) {
        console.error("Error:", err);
        showError('Unable to retrieve location. Please ensure location services are enabled.');
    }
}

// Get user position with timeout
function getPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            resolve,
            err => reject(new Error("Location access denied. Please enable location services.")),
            { 
                enableHighAccuracy: true, 
                timeout: 10000,
                maximumAge: 0 
            }
        );
    });
}

// Fetch hospitals from free APIs
async function fetchHospitals(lat, lon) {
    try {
        // Using Overpass API as primary source
        const overpassData = await fetchOverpassHospitals(lat, lon);
        
        // Using Nominatim as secondary source
        const nominatimData = await fetchNominatimHospitals(lat, lon);
        
        return processHospitalData(overpassData, nominatimData, lat, lon);
    } catch (err) {
        console.error("API error:", err);
        throw new Error("Failed to fetch hospital data. Please try again later.");
    }
}

// Fetch from Overpass API
async function fetchOverpassHospitals(lat, lon) {
    const radius = 5000; // meters
    const query = `[out:json];
        (
            node["amenity"="hospital"](around:${radius},${lat},${lon});
            way["amenity"="hospital"](around:${radius},${lat},${lon});
            relation["amenity"="hospital"](around:${radius},${lat},${lon});
        );
        out center;`;
    
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    return await response.json();
}

// Fetch from Nominatim API
async function fetchNominatimHospitals(lat, lon) {
    const radius = 5; // km
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search.php?q=hospital&format=jsonv2&lat=${lat}&lon=${lon}&radius=${radius}&limit=10`
    );
    return await response.json();
}

// Process and combine hospital data
function processHospitalData(overpassData, nominatimData, userLat, userLon) {
    const hospitals = [];

    // Process Overpass data
    if (overpassData.elements) {
        overpassData.elements.forEach(el => {
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            if (lat && lon) {
                hospitals.push({
                    name: el.tags?.name || "Hospital",
                    lat,
                    lon,
                    distance: getDistance(userLat, userLon, lat, lon),
                    address: el.tags?.["addr:full"] || "",
                    source: "Overpass"
                });
            }
        });
    }

    // Process Nominatim data
    if (nominatimData.length) {
        nominatimData.forEach(hospital => {
            hospitals.push({
                name: hospital.display_name.split(",")[0] || "Hospital",
                lat: parseFloat(hospital.lat),
                lon: parseFloat(hospital.lon),
                distance: getDistance(userLat, userLon, hospital.lat, hospital.lon),
                address: hospital.display_name,
                source: "Nominatim"
            });
        });
    }

    // Remove duplicates (by coordinates)
    const uniqueHospitals = [];
    const seen = new Set();
    
    hospitals.forEach(hospital => {
        const key = `${hospital.lat.toFixed(4)}|${hospital.lon.toFixed(4)}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueHospitals.push(hospital);
        }
    });

    // Sort by distance
    return uniqueHospitals.sort((a, b) => a.distance - b.distance);
}

// Display hospitals in the UI
function displayHospitals(hospitals, userLat, userLon) {
    const hospitalList = document.getElementById('hospitalList');
    
    if (!hospitals.length) {
        hospitalList.innerHTML = '<p class="error">No hospitals found nearby. Try a larger search area.</p>';
        return;
    }

    let html = `
        <div class="results-header">
            <h3>🏥 Nearest Hospitals (${hospitals.length} found)</h3>
            <button onclick="refreshData()" class="refresh-btn">⟳ Refresh</button>
        </div>
    `;

    hospitals.slice(0, 10).forEach((hospital, index) => {
        html += `
            <div class="hospital-card">
                <div class="hospital-info">
                    <h4>${index + 1}. ${hospital.name}</h4>
                    <p class="distance">${hospital.distance.toFixed(1)} km away</p>
                    ${hospital.address ? `<p class="address">${hospital.address.split(",").slice(0, 3).join(",")}</p>` : ''}
                </div>
                <div class="hospital-actions">
                    <button onclick="showRoute(${hospital.lat}, ${hospital.lon})" class="btn route-btn">
                        🗺️ Directions
                    </button>
                    <button onclick="showDetails(${hospital.lat}, ${hospital.lon})" class="btn details-btn">
                        ℹ️ Details
                    </button>
                </div>
            </div>
        `;

        // Add marker on map
        L.marker([hospital.lat, hospital.lon], {
            icon: L.divIcon({
                className: 'hospital-icon',
                html: '🏥',
                iconSize: [30, 30]
            })
        })
        .addTo(map)
        .bindPopup(`
            <b>${hospital.name}</b><br>
            ${hospital.distance.toFixed(1)} km away<br>
            <button onclick="showRoute(${hospital.lat}, ${hospital.lon})" 
                    style="margin-top: 5px; padding: 3px 8px;">
                Get Directions
            </button>
        `);
    });

    hospitalList.innerHTML = html;
}

// Initialize map
function initMap(lat, lon) {
    if (!map) {
        map = L.map('map').setView([lat, lon], 14);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    } else {
        map.setView([lat, lon], 14);
    }

    // Clear existing route if any
    if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }

    // Clear existing markers except user marker
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer !== userMarker) {
            map.removeLayer(layer);
        }
    });

    // Add/update user marker
    if (userMarker) {
        userMarker.setLatLng([lat, lon]);
    } else {
        userMarker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'user-marker',
                html: '📍',
                iconSize: [30, 30]
            })
        })
        .addTo(map)
        .bindPopup('Your location')
        .openPopup();
    }
}

// Show route to hospital
function showRoute(hospitalLat, hospitalLon) {
    navigator.geolocation.getCurrentPosition(position => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        
        // Remove existing route if any
        if (routeControl) {
            map.removeControl(routeControl);
        }
        
        routeControl = L.Routing.control({
            waypoints: [
                L.latLng(userLat, userLon),
                L.latLng(hospitalLat, hospitalLon)
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            routeWhileDragging: true,
            showAlternatives: false,
            lineOptions: {
                styles: [{ color: '#3182ce', opacity: 0.7, weight: 5 }]
            },
            createMarker: function(i, wp) {
                return i === 0 ? 
                    L.marker(wp.latLng, {
                        icon: L.divIcon({
                            className: 'user-marker',
                            html: '📍',
                            iconSize: [30, 30]
                        })
                    }) :
                    L.marker(wp.latLng, {
                        icon: L.divIcon({
                            className: 'hospital-marker',
                            html: '🏥',
                            iconSize: [30, 30]
                        })
                    });
            }
        }).addTo(map);
        
        // Calculate ETA
        const distance = getDistance(userLat, userLon, hospitalLat, hospitalLon);
        const eta = Math.round(distance * 12); // Approx 5 min per km
        alert(`Estimated travel time: ${eta} minutes (${distance.toFixed(1)} km)`);
    }, err => {
        console.error('Error getting current position:', err);
        alert('Unable to get your current location for routing');
    });
}

// Show hospital details on OSM
function showDetails(lat, lon) {
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=18`, '_blank');
}

// Calculate distance between coordinates (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Check if cache is still valid
function isCacheValid(currentLat, currentLon) {
    if (!hospitalCache.data || !hospitalCache.lastUpdated) return false;
    
    const isFresh = (Date.now() - hospitalCache.lastUpdated) < CACHE_DURATION;
    const isNearby = hospitalCache.location && 
        getDistance(currentLat, currentLon, hospitalCache.location.lat, hospitalCache.location.lon) < 2;
    
    return isFresh && isNearby;
}

// Refresh data
function refreshData() {
    hospitalCache.data = null;
    findHospital();
}

// Show error message
function showError(message) {
    const hospitalList = document.getElementById('hospitalList');
    hospitalList.innerHTML = `<p class="error">${message}</p>`;
}

// Call emergency number
function callEmergency() {
    window.location.href = "tel:108";
}