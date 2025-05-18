require('dotenv').config();
const express = require('express');
const { ApifyClient } = require('apify-client');
const cors = require('cors');
const path = require('path'); // Added for serving static files

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes - still useful for local dev or if API is called from other origins
app.use(express.json()); // Parse JSON bodies

// Serve static files from the frontend directory
// Assumes 'frontend' directory is sibling to 'backend' directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize Apify Client
// Make sure to set your APIFY_API_TOKEN in a .env file
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

app.post('/run-actor', async (req, res) => {
    try {
        const actorId = 'Wpp1BZ6yGWjySadk3'; // Your specific actor ID
        let actorInput = req.body; // Get input from request body

        if (!process.env.APIFY_API_TOKEN) {
            return res.status(500).json({ error: 'APIFY_API_TOKEN is not configured in .env file.' });
        }

        if (!actorInput || Object.keys(actorInput).length === 0) {
            console.log('No input provided in request body, using default input.');
            actorInput = {
                "urls": [
                    "https://www.linkedin.com/posts/linkedin_no-is-a-complete-sentence-activity-7247998907798978560-J_hB?utm_source=share&utm_medium=member_desktop",
                    "https://www.linkedin.com/company/amazon",
                    "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=ai&origin=FACETED_SEARCH"
                ],
                "limitPerSource": 10,
                "deepScrape": true,
                "rawData": false
            };
        }

        console.log(`Running actor ${actorId} with input:`, actorInput);
        const run = await apifyClient.actor(actorId).call(actorInput);
        console.log('Actor run initiated. Run ID:', run.id, 'Default Dataset ID:', run.defaultDatasetId);

        console.log('Fetching results from dataset...');
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        console.log(`Results fetched: ${items.length} items`);
        res.json({ runId: run.id, datasetId: run.defaultDatasetId, results: items });

    } catch (error) {
        console.error('Error running actor or fetching results:', error);
        const errorMessage = error.message || 'An unexpected error occurred.';
        const errorStatus = error.statusCode || 500;
        res.status(errorStatus).json({ error: errorMessage, details: error });
    }
});

// For any GET request not handled by static files or other routes, serve index.html
// This is useful for single-page applications with client-side routing
app.get('*', (req, res) => {
    // Ensure this path correctly points to your frontend's index.html
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    if (!process.env.APIFY_API_TOKEN) {
        console.warn('Warning: APIFY_API_TOKEN is not set. Please create a .env file with your Apify API token.');
    }
});