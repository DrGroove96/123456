// API configuration
const OPENWEATHER_API_KEY = '879ea4a729df8bf05abea4e7e6f7c708';
const DEEPSEEK_API_KEY = 'sk-3794fb74c0614f68b21a6d919d98d9d8';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Global variables
let map;
let currentLocation = {
    lat: 40.7934,
    lon: -77.8600,
    name: 'State College'
};

// Global chart variables
let hourlyTempChart = null;
let dailyTempChart = null;
let precipitationChart = null;
let historicalChart = null;

// User preferences
let userPreferences = {
    tempUnit: 'celsius',
    timeFormat: '24h',
    defaultLocation: 'State College'
};

// Add this to your global variables at the top
let userReportedTemps = [];

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    loadUserPreferences();
    initializeMap();
    initializeCharts();
    getCurrentLocation();
});

// Initialize map
function initializeMap() {
    map = L.map('map').setView([currentLocation.lat, currentLocation.lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', (e) => {
        updateWeather(e.latlng.lat, e.latlng.lng);
    });
}

// Initialize charts
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: false
            }
        }
    };

    // Temperature Chart (Hourly)
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    hourlyTempChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'API Temperature (°C)',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                },
                {
                    label: 'User Reported (°C)',
                    data: [],
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                },
                {
                    label: 'Feels Like (°C)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }
            ]
        },
        options: chartOptions
    });

    // Daily Temperature Chart
    const dailyTempCtx = document.getElementById('dailyTemperatureChart').getContext('2d');
    dailyTempChart = new Chart(dailyTempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '5-Day Temperature (°C)',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
                fill: false
            }]
        },
        options: chartOptions
    });

    // Precipitation Chart
    const precipCtx = document.getElementById('precipitationChart').getContext('2d');
    precipitationChart = new Chart(precipCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Rain (mm)',
                    data: [],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
                },
                {
                    label: 'Snow (mm)',
                    data: [],
                    backgroundColor: 'rgba(201, 203, 207, 0.5)'
                }
            ]
        },
        options: {
            ...chartOptions,
            scales: { y: { beginAtZero: true } }
        }
    });

    // Historical Chart
    const historicalCtx = document.getElementById('historicalChart').getContext('2d');
    historicalChart = new Chart(historicalCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Daily Temperature (°C)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: 'Moving Average',
                    data: [],
                    borderColor: 'rgb(255, 159, 64)',
                    borderDash: [5, 5],
                    tension: 0.1
                },
                {
                    label: 'Temperature Trend',
                    data: [],
                    borderColor: 'rgb(153, 102, 255)',
                    borderDash: [10, 5],
                    tension: 0.1
                }
            ]
        },
        options: {
            ...chartOptions,
            plugins: {
                title: {
                    display: true,
                    text: 'Historical Temperature Analysis'
                }
            }
        }
    });
}

// Get current location
function getCurrentLocation() {
    showLoading(true);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                updateWeather(position.coords.latitude, position.coords.longitude);
            },
            error => {
                console.error('Geolocation error:', error);
                updateWeather(currentLocation.lat, currentLocation.lon);
            }
        );
    } else {
        updateWeather(currentLocation.lat, currentLocation.lon);
    }
}

// Update weather data
async function updateWeather(lat, lon) {
    try {
        showLoading(true);
        
        // Clear user reported temperatures when location changes
        userReportedTemps = [];
        
        // Get current weather
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
        );
        const weatherData = await weatherResponse.json();
        
        // Get location name
        const locationResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`
        );
        const locationData = await locationResponse.json();
        
        currentLocation = {
            lat: lat,
            lon: lon,
            name: locationData[0].name
        };

        // Update UI elements
        updateWeatherUI(weatherData);
        
        // Get and update forecast data
        await updateForecastData(lat, lon);
        
        // Update historical analysis
        await updateHistoricalAnalysis(lat, lon);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError('Failed to fetch weather data');
    } finally {
        showLoading(false);
    }
}

// Update weather UI
function updateWeatherUI(data) {
    document.getElementById('location').textContent = currentLocation.name;
    document.getElementById('temperature').textContent = formatTemperature(data.main.temp);
    document.getElementById('feels-like').textContent = formatTemperature(data.main.feels_like);
    document.getElementById('condition').textContent = data.weather[0].main;
    document.getElementById('low-high').textContent = 
        `${formatTemperature(data.main.temp_min)}/${formatTemperature(data.main.temp_max)}`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind').textContent = `${data.wind.speed} m/s`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    document.getElementById('uv-index').textContent = '0'; // UV index not available in free API
    
    // Update weather icon
    const iconCode = data.weather[0].icon;
    document.getElementById('weatherIcon').src = 
        `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

// Update temperature chart with user feedback
function updateTemperatureChart() {
    if (!hourlyTempChart) return;

    const currentData = hourlyTempChart.data;
    const lastIndex = currentData.labels.length - 1;
    
    // Add user reported temperature to the latest time point
    if (lastIndex >= 0) {
        const userTemp = parseFloat(document.getElementById('userTemperature').value);
        currentData.datasets[1].data[lastIndex] = userTemp;
        hourlyTempChart.update();
    }
}

// Temperature feedback submission
async function submitTemperatureFeedback() {
    const userTemp = parseFloat(document.getElementById('userTemperature').value);
    if (isNaN(userTemp)) return;

    try {
        // Update the URL to match your hosted domain
        const response = await fetch('https://your-domain.com/api/temperature-reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                temperature: userTemp,
                location: currentLocation.name,
                lat: currentLocation.lat,
                lon: currentLocation.lon,
                timestamp: new Date().getTime()  // Add timestamp
            })
        });

        if (!response.ok) throw new Error('Failed to submit temperature');

        // Show feedback message
        const feedbackMessage = document.getElementById('feedbackMessage');
        feedbackMessage.textContent = 'Thank you for your feedback!';
        feedbackMessage.style.display = 'block';
        
        // Clear input
        document.getElementById('userTemperature').value = '';
        
        // Update the charts with new data
        await updateForecastData(currentLocation.lat, currentLocation.lon);

        setTimeout(() => {
            feedbackMessage.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('Error submitting temperature:', error);
        const feedbackMessage = document.getElementById('feedbackMessage');
        feedbackMessage.textContent = 'Failed to submit temperature. Please try again.';
        feedbackMessage.style.display = 'block';
    }
}

// Update forecast data
async function updateForecastData(lat, lon) {
    try {
        // Update the URL to match your hosted domain
        const [forecastResponse, reportsResponse] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`),
            fetch(`https://your-domain.com/api/temperature-reports?lat=${lat}&lon=${lon}`)
        ]);

        // Add error checking for responses
        if (!forecastResponse.ok || !reportsResponse.ok) {
            throw new Error('Failed to fetch data');
        }

        const [data, userReports] = await Promise.all([
            forecastResponse.json(),
            reportsResponse.json().catch(() => [])  // Return empty array if JSON parsing fails
        ]);

        // Process hourly data
        const hourlyData = data.list.slice(0, 8);
        const hourlyLabels = hourlyData.map(item => formatTime(item.dt));

        // Process user reports
        const userTemps = hourlyLabels.map(time => {
            const matchingReport = userReports.find(report => 
                formatTime(report.timestamp/1000) === time
            );
            return matchingReport ? matchingReport.temperature : null;
        });

        // Update hourly temperature chart
        updateChartData(hourlyTempChart, {
            labels: hourlyLabels,
            datasets: [
                {
                    label: 'API Temperature (°C)',
                    data: hourlyData.map(item => item.main.temp),
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                },
                {
                    label: 'User Reported (°C)',
                    data: userTemps,
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                },
                {
                    label: 'Feels Like (°C)',
                    data: hourlyData.map(item => item.main.feels_like),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }
            ]
        });

        // Update hourly precipitation chart
        updateChartData(precipitationChart, {
            labels: hourlyLabels,
            datasets: [
                {
                    label: 'Rain (mm)',
                    data: hourlyData.map(item => item.rain ? item.rain['3h'] : 0),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
                },
                {
                    label: 'Snow (mm)',
                    data: hourlyData.map(item => item.snow ? item.snow['3h'] : 0),
                    backgroundColor: 'rgba(201, 203, 207, 0.5)'
                }
            ]
        });

        // Process 5-day forecast data
        const dailyData = [];
        for (let i = 0; i < data.list.length; i += 8) {
            dailyData.push(data.list[i]);
        }
        const dailyLabels = dailyData.map(item => formatDate(item.dt));

        // Calculate average user reported temperature for each day
        const dailyUserAvgs = dailyLabels.map(date => {
            const dayReports = userReports.filter(report => 
                formatDate(report.timestamp.getTime() / 1000) === date
            );
            if (dayReports.length === 0) return null;
            const sum = dayReports.reduce((acc, curr) => acc + curr.temperature, 0);
            return sum / dayReports.length;
        });

        // Update daily temperature chart
        updateChartData(dailyTempChart, {
            labels: dailyLabels,
            datasets: [
                {
                    label: 'API Temperature (°C)',
                    data: dailyData.map(item => item.main.temp),
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Average User Reported (°C)',
                    data: dailyUserAvgs,
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1,
                    borderDash: [5, 5],
                    fill: false
                }
            ]
        });

        // Update daily precipitation chart
        updateChartData(precipitationChart, {
            labels: dailyLabels,
            datasets: [
                {
                    label: 'Rain (mm)',
                    data: dailyData.map(item => item.rain ? item.rain['3h'] : 0),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
                },
                {
                    label: 'Snow (mm)',
                    data: dailyData.map(item => item.snow ? item.snow['3h'] : 0),
                    backgroundColor: 'rgba(201, 203, 207, 0.5)'
                }
            ]
        });

    } catch (error) {
        console.error('Error updating forecast:', error);
    }
}

// Update historical analysis
async function updateHistoricalAnalysis(lat, lon) {
    try {
        // Simulate 30 days of historical data
        const dates = Array.from({length: 30}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i)); // Count forward from 30 days ago
            return formatDate(date.getTime() / 1000);
        });
        
        // Generate realistic-looking temperature data
        const baseTemp = 20; // Base temperature
        const temps = dates.map(() => baseTemp + (Math.random() * 10 - 5)); // Variation of ±5°C
        
        // Calculate moving average
        const average = temps.map((_, index, array) => {
            const slice = array.slice(0, index + 1);
            return slice.reduce((sum, val) => sum + val, 0) / slice.length;
        });
        
        // Calculate trend using simple linear regression
        const trend = temps.map((_, index) => {
            const x = index;
            const y = temps[index];
            const xMean = (temps.length - 1) / 2;
            const yMean = temps.reduce((a, b) => a + b) / temps.length;
            const slope = temps.reduce((a, b, i) => a + (i - xMean) * (b - yMean), 0) / 
                         temps.reduce((a, _, i) => a + Math.pow(i - xMean, 2), 0);
            return yMean + slope * (x - xMean);
        });

        // Update historical chart
        if (historicalChart) {
            updateChartData(historicalChart, {
                labels: dates,
                datasets: [
                    {
                        label: 'Daily Temperature (°C)',
                        data: temps,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'Moving Average',
                        data: average,
                        borderColor: 'rgb(255, 159, 64)',
                        borderDash: [5, 5],
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'Temperature Trend',
                        data: trend,
                        borderColor: 'rgb(153, 102, 255)',
                        borderDash: [10, 5],
                        tension: 0.1,
                        fill: false
                    }
                ]
            });
        }
    } catch (error) {
        console.error('Error updating historical analysis:', error);
    }
}

// Helper function to format dates consistently
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Update chart data helper function
function updateChartData(chart, newData) {
    if (chart) {
        chart.data = newData;
        chart.update();
    }
}

// Format helpers
function formatTemperature(temp) {
    if (userPreferences.tempUnit === 'fahrenheit') {
        temp = (temp * 9/5) + 32;
    }
    return `${Math.round(temp)}°${userPreferences.tempUnit === 'celsius' ? 'C' : 'F'}`;
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    if (userPreferences.timeFormat === '24h') {
        return `${date.getHours()}:00`;
    }
    return date.toLocaleTimeString([], {hour: 'numeric'});
}

// UI helpers
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showError(message) {
    // Implement error display
    console.error(message);
}

// Settings functions
function toggleSettings() {
    document.getElementById('settingsPanel').classList.toggle('active');
}

function saveSettings() {
    userPreferences = {
        tempUnit: document.getElementById('tempUnit').value,
        timeFormat: document.getElementById('timeFormat').value,
        defaultLocation: document.getElementById('defaultLocation').value
    };
    localStorage.setItem('weatherPreferences', JSON.stringify(userPreferences));
    document.getElementById('settingsPanel').classList.remove('active');
    updateWeather(currentLocation.lat, currentLocation.lon);
}

function loadUserPreferences() {
    const saved = localStorage.getItem('weatherPreferences');
    if (saved) {
        userPreferences = JSON.parse(saved);
        document.getElementById('tempUnit').value = userPreferences.tempUnit;
        document.getElementById('timeFormat').value = userPreferences.timeFormat;
        document.getElementById('defaultLocation').value = userPreferences.defaultLocation;
    }
}

// Forecast tab switching
function switchForecast(type) {
    // Hide all forecast content
    document.querySelectorAll('.forecast-content').forEach(el => {
        el.style.display = 'none';
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected forecast content and activate tab
    document.getElementById(`${type}Forecast`).style.display = 'block';
    document.querySelector(`button[onclick="switchForecast('${type}')"]`).classList.add('active');
    
    // Update charts to fix any rendering issues
    if (type === 'hourly') {
        hourlyTempChart.update();
        precipitationChart.update();
    } else {
        dailyTempChart.update();
        precipitationChart.update();
    }
}

// Chat functionality
document.getElementById('chatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // Clear input
    chatInput.value = '';
    
    // Display user message
    appendMessage('user', userMessage);

    try {
        // Get weather context
        const weatherContext = {
            location: currentLocation.name,
            temperature: document.getElementById('temperature').textContent,
            condition: document.getElementById('condition').textContent,
            humidity: document.getElementById('humidity').textContent,
            wind: document.getElementById('wind').textContent
        };

        // Call AI API
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful weather assistant."
                    },
                    {
                        role: "user",
                        content: `Current weather in ${weatherContext.location}:
                            Temperature: ${weatherContext.temperature}
                            Condition: ${weatherContext.condition}
                            Humidity: ${weatherContext.humidity}
                            Wind: ${weatherContext.wind}

                            User question: ${userMessage}`
                    }
                ]
            })
        });

        const data = await response.json();
        appendMessage('assistant', data.choices[0].message.content);

    } catch (error) {
        console.error('Error:', error);
        appendMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
}

function appendMessage(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${role}-message`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}