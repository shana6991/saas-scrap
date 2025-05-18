document.addEventListener('DOMContentLoaded', () => {
    const actorInputTextarea = document.getElementById('actorInput');
    const runActorButton = document.getElementById('runActorButton');
    const clearInputButton = document.getElementById('clearInputButton');
    const clearResultsButton = document.getElementById('clearResultsButton');
    const resultsOutputDiv = document.getElementById('resultsOutput'); // Changed to Div
    const loader = document.getElementById('loader');
    const statusMessageElement = document.getElementById('statusMessage');
    const errorMessageElement = document.getElementById('errorMessage');

    const initialInputContent = actorInputTextarea.value;
    const backendUrl = '/run-actor';

    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.className = 'message ' + (isError ? 'error-message' : 'status-message');
        element.style.display = message ? 'block' : 'none';
    }

    function renderResults(items) {
        resultsOutputDiv.innerHTML = ''; // Clear previous results
        if (!items || items.length === 0) {
            resultsOutputDiv.textContent = 'No items found in the dataset for this run.';
            return;
        }

        if (Array.isArray(items) && items.every(item => typeof item === 'object' && item !== null)) {
            // If it's an array of objects, render as cards
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'result-item';
                let cardHTML = '';
                // Attempt to find some common fields to display, or fallback to stringifying key-values
                if (item.url || item.link || item.href) {
                    cardHTML += `<p><strong>URL:</strong> <a href="${item.url || item.link || item.href}" target="_blank" rel="noopener noreferrer">${item.url || item.link || item.href}</a></p>`;
                }
                if (item.title || item.name) {
                    cardHTML += `<p><strong>Title:</strong> ${item.title || item.name}</p>`;
                }
                if (item.text || item.description || item.caption) {
                    cardHTML += `<p><strong>Description:</strong> ${String(item.text || item.description || item.caption).substring(0, 200)}...</p>`;
                }
                // Add a few more generic fields if they exist
                for (const key in item) {
                    if (item.hasOwnProperty(key) && !(key === 'url' || key === 'link' || key === 'href' || key === 'title' || key === 'name' || key === 'text' || key === 'description' || key ==='caption')) {
                         if (typeof item[key] === 'string' || typeof item[key] === 'number' || typeof item[key] === 'boolean') {
                            cardHTML += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${item[key]}</p>`;
                        }
                    }
                }
                 if (cardHTML === '') { // Fallback for items that don't match common fields
                    cardHTML = `<pre>${JSON.stringify(item, null, 2)}</pre>`;
                }
                card.innerHTML = cardHTML;
                resultsOutputDiv.appendChild(card);
            });
        } else {
            // Fallback to pretty-printed JSON if not an array of objects
            resultsOutputDiv.innerHTML = `<pre>${JSON.stringify(items, null, 2)}</pre>`;
        }
    }

    runActorButton.addEventListener('click', async () => {
        resultsOutputDiv.innerHTML = 'Actor results will appear here...'; // Reset results view
        displayMessage(statusMessageElement, '');
        displayMessage(errorMessageElement, '', true);
        loader.style.display = 'block';
        runActorButton.disabled = true;
        clearInputButton.disabled = true;
        clearResultsButton.disabled = true;

        let inputJson;
        try {
            inputJson = JSON.parse(actorInputTextarea.value);
        } catch (error) {
            displayMessage(errorMessageElement, 'Invalid JSON input: ' + error.message, true);
            loader.style.display = 'none';
            runActorButton.disabled = false;
            clearInputButton.disabled = false;
            clearResultsButton.disabled = false;
            return;
        }

        try {
            displayMessage(statusMessageElement, 'Running actor... This might take a moment. Please wait.');
            
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inputJson),
            });

            loader.style.display = 'none';
            runActorButton.disabled = false;
            clearInputButton.disabled = false;
            clearResultsButton.disabled = false;

            if (!response.ok) {
                let errorData = { error: 'Failed to retrieve error details' };
                try { errorData = await response.json(); }
                catch (e) { errorData.error = await response.text() || errorData.error; }
                throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorData.error || 'Unknown server error'}`);
            }

            const data = await response.json();
            displayMessage(statusMessageElement, `Actor run successful! Run ID: ${data.runId}, Dataset ID: ${data.datasetId}`);
            renderResults(data.results);

        } catch (error) {
            console.error('Error during actor run or fetching results:', error);
            displayMessage(errorMessageElement, 'Operation failed: ' + error.message, true);
            loader.style.display = 'none';
            runActorButton.disabled = false;
            clearInputButton.disabled = false;
            clearResultsButton.disabled = false;
        }
    });

    clearInputButton.addEventListener('click', () => {
        actorInputTextarea.value = initialInputContent; // Or set to empty: ''
        displayMessage(statusMessageElement, '');
        displayMessage(errorMessageElement, '', true);
    });

    clearResultsButton.addEventListener('click', () => {
        resultsOutputDiv.innerHTML = 'Actor results will appear here...';
        displayMessage(statusMessageElement, '');
        // Optionally keep or clear error messages related to the run that produced these results
        // displayMessage(errorMessageElement, '', true); 
    });
});