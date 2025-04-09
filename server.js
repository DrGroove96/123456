require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Temperature Report Schema
const temperatureReportSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    temperature: Number,
    location: String,
    lat: Number,
    lon: Number
});

const TemperatureReport = mongoose.model('TemperatureReport', temperatureReportSchema);

// API Routes
app.post('/api/temperature-reports', async (req, res) => {
    try {
        const report = new TemperatureReport({
            temperature: req.body.temperature,
            location: req.body.location,
            lat: req.body.lat,
            lon: req.body.lon
        });
        
        await report.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving temperature report:', error);
        res.status(500).json({ error: 'Failed to save temperature report' });
    }
});

app.get('/api/temperature-reports', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        
        // Get reports within ~10km radius from the last 24 hours
        const nearbyReports = await TemperatureReport.find({
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            lat: { $gte: parseFloat(lat) - 0.1, $lte: parseFloat(lat) + 0.1 },
            lon: { $gte: parseFloat(lon) - 0.1, $lte: parseFloat(lon) + 0.1 }
        }).sort('-timestamp');

        res.json(nearbyReports);
    } catch (error) {
        console.error('Error fetching temperature reports:', error);
        res.status(500).json({ error: 'Failed to fetch temperature reports' });
    }
});

// Cleanup old reports (run daily)
setInterval(async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await TemperatureReport.deleteMany({ timestamp: { $lt: thirtyDaysAgo } });
    } catch (error) {
        console.error('Error cleaning up old reports:', error);
    }
}, 24 * 60 * 60 * 1000);

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 