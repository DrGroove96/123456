const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Store reported temperatures
let reportedTemperatures = [];
let clients = new Set();

// Parse JSON bodies
app.use(express.json());
app.use(express.static(__dirname));

// SSE endpoint
app.get('/temperature-updates', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial data
    res.write(`data: ${JSON.stringify(reportedTemperatures)}\n\n`);

    // Add client to Set
    clients.add(res);

    req.on('close', () => {
        clients.delete(res);
    });
});

// Endpoint to receive temperature reports
app.post('/report-temperature', (req, res) => {
    const { temperature, location, timestamp } = req.body;
    const report = { temperature, location, timestamp };
    
    reportedTemperatures.push(report);
    // Keep only last 100 reports
    if (reportedTemperatures.length > 100) {
        reportedTemperatures.shift();
    }

    // Notify all clients
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify([report])}\n\n`);
    });

    res.json({ success: true });
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 