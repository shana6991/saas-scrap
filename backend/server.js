require('dotenv').config();
const express = require('express');
const { ApifyClient } = require('apify-client');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies

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
            // Use default input if none is provided in the request body
            // You might want to remove this or make it more sophisticated
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
        // Check if the error is from ApifyClient or a general error
        const errorMessage = error.message || 'An unexpected error occurred.';
        const errorStatus = error.statusCode || 500;
        res.status(errorStatus).json({ error: errorMessage, details: error });
    }
});

app.get('/', (req, res) => {
    res.send('Backend server is running. Use POST /run-actor to trigger the Apify actor.');
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    if (!process.env.APIFY_API_TOKEN) {
        console.warn('Warning: APIFY_API_TOKEN is not set. Please create a .env file with your Apify API token.');
    }
});
