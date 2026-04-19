const SCRAPER_ENDPOINTS = [
    'http://localhost:5000/scraper',
    'http://127.0.0.1:5000/scraper'
];

const REVIEW_ENDPOINTS = [
    'http://localhost:5000/sendreview',
    'http://127.0.0.1:5000/sendreview'
];

const GET_REVIEW_ENDPOINTS = [
    'http://localhost:5000/getreview',
    'http://127.0.0.1:5000/getreview'
];

function fetchWithTimeout(url, options = {}, timeout = 6000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Fetch timed out after ' + timeout + 'ms'));
        }, timeout);

        fetch(url, options)
            .then(response => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch(error => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

async function tryPostJobData(url, jobData) {
    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
    }, 6000);
    return response;
}

async function postJobData(jobData) {
    for (const endpoint of SCRAPER_ENDPOINTS) {
        try {
            const response = await tryPostJobData(endpoint, jobData);
            if (!response.ok) {
                const errorText = await response.text();
                console.warn('Failed to post job data to', endpoint, response.status, errorText);
                continue;
            }
            console.log('Successfully posted job data to', endpoint, jobData);
            return { success: true };
        } catch (error) {
            console.warn('Job post failed for', endpoint, error);
        }
    }
    return { success: false, error: 'All endpoints failed' };
}

async function tryPostReviewData(url, reviewData) {
    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
    }, 6000);
    return response;
}

async function postReviewData(reviewData) {
    let lastError = null;

    for (const endpoint of REVIEW_ENDPOINTS) {
        try {
            const response = await tryPostReviewData(endpoint, reviewData);
            if (!response.ok) {
                const errorText = await response.text();
                console.warn('Failed to post review data to', endpoint, response.status, errorText);
                lastError = { success: false, status: response.status, error: errorText || ('HTTP ' + response.status) };
                continue;
            }
            const bodyText = await response.text();
            console.log('Successfully posted review data to', endpoint, reviewData);
            return { success: true, status: response.status, body: bodyText };
        } catch (error) {
            console.warn('Review post failed for', endpoint, error);
            lastError = { success: false, error: error?.message || String(error) };
        }
    }
    return lastError || { success: false, error: 'All endpoints failed' };
}

async function tryGetReviewData(url, params) {
    const query = new URLSearchParams(params).toString();
    const targetUrl = `${url}?${query}`;
    const response = await fetchWithTimeout(targetUrl, { method: 'GET' }, 6000);
    return response;
}

async function getReviewData(params) {
    let lastError = null;

    for (const endpoint of GET_REVIEW_ENDPOINTS) {
        try {
            const response = await tryGetReviewData(endpoint, params);
            if (!response.ok) {
                const errorText = await response.text();
                console.warn('Failed to fetch review data from', endpoint, response.status, errorText);
                lastError = { success: false, status: response.status, error: errorText || ('HTTP ' + response.status) };
                continue;
            }

            const body = await response.json();
            return { success: true, status: response.status, data: body };
        } catch (error) {
            console.warn('Review GET failed for', endpoint, error);
            lastError = { success: false, error: error?.message || String(error) };
        }
    }

    return lastError || { success: false, error: 'All endpoints failed' };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'postJobData') {
        postJobData(message.jobData)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error?.message || String(error) }));
        return true;
    }

    if (message?.type === 'postReviewData') {
        postReviewData(message.reviewData)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error?.message || String(error) }));
        return true;
    }

    if (message?.type === 'getReviewData') {
        getReviewData(message.params)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error?.message || String(error) }));
        return true;
    }

    if (message?.action === 'openPopup') {
        if (chrome.action) {
            chrome.action.openPopup();
        }
    }
});