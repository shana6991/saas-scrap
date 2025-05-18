document.addEventListener('DOMContentLoaded', () => {
    const actorInputTextarea = document.getElementById('actorInput');
    const runActorButton = document.getElementById('runActorButton');
    const resultsOutput = document.getElementById('resultsOutput');
    const loader = document.getElementById('loader');
    const statusMessageElement = document.getElementById('statusMessage');
    const errorMessageElement = document.getElementById('errorMessage');

    const backendUrl = '/run-actor'; // Changed to relative path

    runActorButton.addEventListener('click', async () => {
        // Clear previous messages and results
        resultsOutput.textContent = 'Actor results will appear here...';
        statusMessageElement.textContent = '';
        errorMessageElement.textContent = '';
        loader.style.display = 'block';
        runActorButton.disabled = true;

        let inputJson;
        try {
            // Validate and parse the JSON input from the textarea
            inputJson = JSON.parse(actorInputTextarea.value);
        } catch (error) {
            errorMessageElement.textContent = 'Invalid JSON input: ' + error.message;
            loader.style.display = 'none';
            runActorButton.disabled = false;
            return; // Stop execution if JSON is invalid
        }

        try {
            statusMessageElement.textContent = 'Running actor... This might take a moment. Please wait.';
            
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inputJson), // Send the parsed JSON input
            });

            // Hide loader and re-enable button regardless of response outcome
            loader.style.display = 'none';
            runActorButton.disabled = false;

            if (!response.ok) {
                let errorData;
                try {
                    // Try to parse error response as JSON
                    errorData = await response.json();
                } catch (e) {
                    // If parsing error response fails, use the response text
                    errorData = { error: await response.text() || 'Failed to retrieve error details' }; 
                }
                // Construct a comprehensive error message
                throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorData.error || 'Unknown server error'}`);
            }

            const data = await response.json();
            statusMessageElement.textContent = `Actor run successful! Run ID: ${data.runId}, Dataset ID: ${data.datasetId}`;
            
            if (data.results && data.results.length > 0) {
                resultsOutput.textContent = JSON.stringify(data.results, null, 2); // Pretty print JSON
            } else {
                resultsOutput.textContent = 'No items found in the dataset for this run.';
            }

        } catch (error) {
            console.error('Error during actor run or fetching results:', error);
            errorMessageElement.textContent = 'Operation failed: ' + error.message;
            // Ensure loader is hidden and button is enabled in case of an error
            loader.style.display = 'none';
            runActorButton.disabled = false;
        }
    });
});