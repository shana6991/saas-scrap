document.addEventListener('DOMContentLoaded', () => {
    const urlsContainer = document.getElementById('urlsContainer');
    const addUrlButton = document.getElementById('addUrlButton');
    const limitPerSourceInput = document.getElementById('limitPerSource');
    const deepScrapeCheckbox = document.getElementById('deepScrape');
    const rawDataCheckbox = document.getElementById('rawData');
    
    const runActorButton = document.getElementById('runActorButton');
    const clearAllInputsButton = document.getElementById('clearAllInputsButton');
    const clearResultsButton = document.getElementById('clearResultsButton');
    const resultsOutputDiv = document.getElementById('resultsOutput');
    const loader = document.getElementById('loader');
    const statusMessageElement = document.getElementById('statusMessage');
    const errorMessageElement = document.getElementById('errorMessage');

    const backendUrl = '/run-actor';

    // --- Default Input Values --- 
    const defaultLimit = 5;
    const defaultDeepScrape = false;
    const defaultRawData = false;
    const defaultUrls = [
        "https://www.linkedin.com/posts/linkedin_no-is-a-complete-sentence-activity-7247998907798978560-J_hB?utm_source=share&utm_medium=member_desktop",
        "https://www.linkedin.com/company/amazon"
    ];

    function createUrlInputEntry(urlValue = '') {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'url-input-container';

        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = 'url-input';
        newInput.placeholder = 'https://www.linkedin.com/...';
        newInput.value = urlValue;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.textContent = 'Remove';
        removeButton.className = 'secondary small danger';
        removeButton.onclick = () => {
            inputContainer.remove();
            // Ensure at least one URL input remains if all are removed by user
            if (urlsContainer.children.length === 0) {
                createUrlInputEntry(); // Add a blank one back
            }
        };

        inputContainer.appendChild(newInput);
        inputContainer.appendChild(removeButton);
        urlsContainer.appendChild(inputContainer);
    }

    function resetInputsToDefaults() {
        urlsContainer.innerHTML = ''; // Clear existing URL inputs
        defaultUrls.forEach(url => createUrlInputEntry(url));
        if (defaultUrls.length === 0) { // Ensure at least one empty field if no defaults
            createUrlInputEntry();
        }
        limitPerSourceInput.value = defaultLimit;
        deepScrapeCheckbox.checked = defaultDeepScrape;
        rawDataCheckbox.checked = defaultRawData;
        displayMessage(statusMessageElement, '');
        displayMessage(errorMessageElement, '', true);
    }

    // Initialize URL fields on page load
    resetInputsToDefaults(); 

    addUrlButton.addEventListener('click', () => createUrlInputEntry());
    clearAllInputsButton.addEventListener('click', resetInputsToDefaults);

    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.className = 'message ' + (isError ? 'error-message' : 'status-message');
        element.style.display = message ? 'block' : 'none';
    }

    function renderResults(items) {
        resultsOutputDiv.innerHTML = ''; 
        if (!items || items.length === 0) {
            resultsOutputDiv.textContent = 'No items found in the dataset for this run.';
            return;
        }
        if (Array.isArray(items) && items.every(item => typeof item === 'object' && item !== null)) {
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'result-item';
                let cardHTML = '';
                if (item.url || item.link || item.href) {
                    cardHTML += `<p><strong>URL:</strong> <a href="${item.url || item.link || item.href}" target="_blank" rel="noopener noreferrer">${item.url || item.link || item.href}</a></p>`;
                }
                if (item.title || item.name) {
                    cardHTML += `<p><strong>Title:</strong> ${item.title || item.name}</p>`;
                }
                if (item.text || item.description || item.caption) {
                    cardHTML += `<p><strong>Description:</strong> ${String(item.text || item.description || item.caption).substring(0, 200)}...</p>`;
                }
                for (const key in item) {
                    if (item.hasOwnProperty(key) && !(key === 'url' || key === 'link' || key === 'href' || key === 'title' || key === 'name' || key === 'text' || key === 'description' || key ==='caption')) {
                         if (typeof item[key] === 'string' || typeof item[key] === 'number' || typeof item[key] === 'boolean') {
                            cardHTML += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${item[key]}</p>`;
                        }
                    }
                }
                 if (cardHTML === '') { 
                    cardHTML = `<pre>${JSON.stringify(item, null, 2)}</pre>`;
                }
                card.innerHTML = cardHTML;
                resultsOutputDiv.appendChild(card);
            });
        } else {
            resultsOutputDiv.innerHTML = `<pre>${JSON.stringify(items, null, 2)}</pre>`;
        }
    }

    runActorButton.addEventListener('click', async () => {
        resultsOutputDiv.innerHTML = 'Actor results will appear here...';
        displayMessage(statusMessageElement, '');
        displayMessage(errorMessageElement, '', true);
        loader.style.display = 'block';
        runActorButton.disabled = true;
        clearAllInputsButton.disabled = true;
        clearResultsButton.disabled = true;
        addUrlButton.disabled = true;
        document.querySelectorAll('.url-input-container button').forEach(btn => btn.disabled = true);
        document.querySelectorAll('.url-input, #limitPerSource, #deepScrape, #rawData').forEach(input => input.disabled = true);


        const urls = Array.from(urlsContainer.querySelectorAll('.url-input'))
                            .map(input => input.value.trim())
                            .filter(url => url !== '');

        if (urls.length === 0) {
            displayMessage(errorMessageElement, 'Please enter at least one URL.', true);
            loader.style.display = 'none';
            runActorButton.disabled = false; clearAllInputsButton.disabled = false; clearResultsButton.disabled = false; addUrlButton.disabled = false;
            document.querySelectorAll('.url-input-container button').forEach(btn => btn.disabled = false);
            document.querySelectorAll('.url-input, #limitPerSource, #deepScrape, #rawData').forEach(input => input.disabled = false);
            return;
        }

        const actorInput = {
            urls: urls,
            limitPerSource: parseInt(limitPerSourceInput.value, 10) || defaultLimit,
            deepScrape: deepScrapeCheckbox.checked,
            rawData: rawDataCheckbox.checked
        };

        try {
            displayMessage(statusMessageElement, 'Running actor... This might take a moment. Please wait.');
            
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actorInput),
            });
            
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
        } finally {
            loader.style.display = 'none';
            runActorButton.disabled = false; clearAllInputsButton.disabled = false; clearResultsButton.disabled = false; addUrlButton.disabled = false;
            document.querySelectorAll('.url-input-container button').forEach(btn => btn.disabled = false);
            document.querySelectorAll('.url-input, #limitPerSource, #deepScrape, #rawData').forEach(input => input.disabled = false);
        }
    });

    clearResultsButton.addEventListener('click', () => {
        resultsOutputDiv.innerHTML = 'Actor results will appear here...';
        displayMessage(statusMessageElement, '');
    });
});