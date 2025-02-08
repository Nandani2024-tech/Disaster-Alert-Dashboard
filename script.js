// Initialize map and marker
let map, marker;

// Function to initialize the map
function initMap() {
    map = L.map('map').setView([37.7749, -122.4194], 5); // Default view: San Francisco

    // Adding OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Adding default marker
    marker = L.marker([37.7749, -122.4194]).addTo(map)
        .bindPopup('Default Location: San Francisco')
        .openPopup();
}

// Function to search for a location and update the map
async function searchLocation(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.length > 0) {
            const { lat, lon, display_name } = data[0];

            // Update map view to new location
            map.setView([lat, lon], 8);
            marker.setLatLng([lat, lon]) // Move marker to new location
                .bindPopup(`<b>${display_name}</b>`)
                .openPopup();

            // Fetch disaster alerts, earthquake trends, and emergency alerts for new location
            fetchDisasterAlerts(lat, lon);
            fetchEarthquakeTrends(lat, lon);
            fetchEmergencyAlerts(lat, lon);
        } else {
            alert("Location not found!");
        }
    } catch (error) {
        console.error("Error fetching location data:", error);
    }
}

// Event listener for search bar (trigger search on pressing Enter key)
document.getElementById("search").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        searchLocation(this.value);
    }
});

// Function to fetch and display GDACS emergency alerts
async function fetchEmergencyAlerts(lat = 37.7749, lon = -122.4194) {
    try {
        const response = await fetch("https://www.gdacs.org/xml/rss.xml");
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const items = xml.querySelectorAll("item");
        
        const alertList = document.getElementById("news-list");
        alertList.innerHTML = ""; // Clear previous alerts
        
        if (items.length === 0) {
            alertList.innerHTML = "<li>No recent emergency alerts.</li>";
            return;
        }
        
        // Loop through emergency alert items (limit to 5)
        items.forEach((item, index) => {
            if (index < 5) {
                const title = item.querySelector("title").textContent;
                const link = item.querySelector("link").textContent;
                const pubDate = item.querySelector("pubDate").textContent;
                
                const alertItem = document.createElement("li");
                alertItem.innerHTML = `
                    <a href="${link}" target="_blank"><strong>${title}</strong></a>
                    <br> <small>${new Date(pubDate).toLocaleString()}</small>
                `;
                alertList.appendChild(alertItem);
            }
        });
    } catch (error) {
        console.error("Error fetching emergency alerts:", error);
    }
}

// Function to fetch and display disaster alerts (earthquakes)
async function fetchDisasterAlerts(lat = 37.7749, lon = -122.4194) {
    try {
        const response = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=500&limit=5`);
        const data = await response.json();
        const alertList = document.getElementById("alert-list");
        alertList.innerHTML = ""; // Clear previous alerts

        if (data.features.length === 0) {
            alertList.innerHTML = "<li>No recent alerts for this location.</li>";
            return;
        }

        // Loop through earthquake alerts and display them
        data.features.forEach(alert => {
            const { mag, place, time } = alert.properties;
            const alertItem = document.createElement("li");
            alertItem.innerHTML = `<strong>${mag}M Earthquake</strong> - ${place} <br> <small>${new Date(time).toLocaleString()}</small>`;
            alertList.appendChild(alertItem);
        });
    } catch (error) {
        console.error('Error fetching disaster alerts:', error);
    }
}

// Function to fetch and display earthquake trends
async function fetchEarthquakeTrends(lat = 37.7749, lon = -122.4194) {
    try {
        const response = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=500&limit=20`);
        const data = await response.json();
        
        // Extract relevant data for visualization
        const trendData = data.features.map(feature => ({
            time: new Date(feature.properties.time),
            magnitude: feature.properties.mag
        }));
        
        displayEarthquakeTrends(trendData);
    } catch (error) {
        console.error('Error fetching earthquake trends:', error);
    }
}

// Function to display earthquake trends on a chart
function displayEarthquakeTrends(trendData) {
    const trendChartCanvas = document.getElementById("trendChartCanvas").getContext("2d");

    if (!trendData.length) {
        document.getElementById("trendChartCanvas").innerHTML = "No data available.";
        return;
    }

    // Prepare labels and data for the chart
    const labels = trendData.map(data => data.time.toLocaleDateString());
    const magnitudes = trendData.map(data => data.magnitude);

    // Destroy previous chart if exists
    if (window.earthquakeChart) {
        window.earthquakeChart.destroy();
    }

    // Create a new chart
    window.earthquakeChart = new Chart(trendChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Earthquakes Near Selected Location',
                data: magnitudes,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Magnitude'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 6
                    }
                }
            }
        }
    });
}

// Function to initialize the dashboard
document.addEventListener("DOMContentLoaded", function() {
    initMap();
    fetchDisasterAlerts();
    fetchEarthquakeTrends();
    fetchEmergencyAlerts();
});
