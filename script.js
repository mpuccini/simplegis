// Initialize the map
var map = L.map('map').setView([0, 0], 2);

// Add a tile layer (you can use other tile providers)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Make a request to your FastAPI endpoint
fetch('http://131.175.205.176/api/v1/webgis/download/stream/sample.json')
    .then(response => response.json())
    .then(data => {
        // Add GeoJSON layer to the map
        L.geoJSON(data).addTo(map);
    })
    .catch(error => console.error('Error:', error));

