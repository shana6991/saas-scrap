require('dotenv').config();
const express = require('express');
const { ApifyClient } = require('apify-client');
const { createClient } = require('@supabase/supabase-js'); // Import Supabase
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize Apify Client
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// Initialize Supabase Client
let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    console.log('Supabase client initialized.');
} else {
    console.warn('Supabase URL or Anon Key not provided. Supabase client not initialized.');
}


app.post('/run-actor', async (req, res) => {
    const actorId = 'Wpp1BZ6yGWjySadk3';
    let actorInput = req.body;
    let runDetails = {}; // To store run details for Supabase logging
    let apifyResults = [];

    try {
        if (!process.env.APIFY_API_TOKEN) {
            throw new Error('APIFY_API_TOKEN is not configured.');
        }
        if (!actorInput || Object.keys(actorInput).length === 0) {
            console.log('No input provided, using default.'); // Simplified default input handling for brevity
            actorInput = {
                urls: ["https://www.linkedin.com/company/amazon"],
                limitPerSource: 2,
                deepScrape: false,
                rawData: false 
            };
        }

        console.log(`Running actor ${actorId} with input:`, actorInput);
        const run = await apifyClient.actor(actorId).call(actorInput);
        runDetails = { apify_run_id: run.id, apify_dataset_id: run.defaultDatasetId, actor_input: actorInput };
        console.log('Actor run initiated:', runDetails);

        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        apifyResults = items;
        console.log(`Results fetched: ${items.length} items`);
        
        // Attempt to save to Supabase (fire and forget for now, or add proper error handling)
        if (supabase) {
            const { data, error } = await supabase
                .from('actor_runs')
                .insert([
                    {
                        apify_run_id: runDetails.apify_run_id,
                        apify_dataset_id: runDetails.apify_dataset_id,
                        actor_input: actorInput,
                        results: apifyResults,
                        status: 'SUCCESS'
                    }
                ])
                .select(); // Optionally select to see the inserted data or get ID

            if (error) {
                console.error('Supabase save error:', error);
                // Don't let Supabase error break the main response to user
            } else {
                console.log('Successfully saved to Supabase:', data);
            }
        }

        res.json({ runId: run.id, datasetId: run.defaultDatasetId, results: apifyResults });

    } catch (error) {
        console.error('Error in /run-actor:', error.message);
        // Save error to Supabase as well
        if (supabase && runDetails.apify_run_id) { // Only if we have a run ID
             await supabase
                .from('actor_runs')
                .insert([
                    {
                        apify_run_id: runDetails.apify_run_id, // Might be undefined if actor.call failed early
                        apify_dataset_id: runDetails.apify_dataset_id,
                        actor_input: actorInput,
                        status: 'ERROR',
                        error_message: error.message
                    }
                ]);
        }
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    if (!process.env.APIFY_API_TOKEN) {
        console.warn('Warning: APIFY_API_TOKEN is not set.');
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.warn('Warning: SUPABASE_URL or SUPABASE_ANON_KEY is not set. Supabase integration might fail.');
    }
});