// Load Firebase SDK
(function() {
    if (window.firebase) return; // Already loaded

    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
    script.onload = function() {
        const firestoreScript = document.createElement('script');
        firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
        firestoreScript.onload = function() {
            // Initialize Firebase (replace with your actual config)
            const firebaseConfig = {
                apiKey: "your-api-key",
                authDomain: "despicable-devs.firebaseapp.com",
                projectId: "despicable-devs",
                storageBucket: "despicable-devs.appspot.com",
                messagingSenderId: "your-sender-id",
                appId: "your-app-id"
            };
            firebase.initializeApp(firebaseConfig);
            window.db = firebase.firestore();
            console.log("Firebase initialized");
        };
        document.head.appendChild(firestoreScript);
    };
    document.head.appendChild(script);
})();

// Helper functions (copied from content.js)
function isMjobSite() {
    return window.location.host.includes('mjob');
}

function extractJobData(jobContainer) {
    console.log("Extracting job data from container:", jobContainer);
    const jobData = {
        title: '',
        company: '',
        location: ''
    };

    if (isMjobSite()) {
        const card = jobContainer.closest('a.job-card') || jobContainer.closest('.job-card') || jobContainer;

        const titleElement = Array.from(card.querySelectorAll('h5')).find(el => el.classList.contains('underline') && el.classList.contains('line-clamp-1')) || card.querySelector('h5');
        if (titleElement) {
            jobData.title = titleElement.textContent.trim();
        }

        const companyElement = Array.from(card.querySelectorAll('span')).find(el => el.classList.contains('text-body-4-extra-light') && el.classList.contains('uppercase'))
            || Array.from(card.querySelectorAll('span')).find(el => el.classList.contains('uppercase'))
            || card.querySelector('span');
        if (companyElement) {
            jobData.company = companyElement.textContent.trim();
        }

        const locationRow = Array.from(card.querySelectorAll('div')).find(el =>
            el.classList.contains('flex') &&
            el.classList.contains('items-center') &&
            el.classList.contains('gap-4') &&
            el.classList.contains('text-[14px]')
        );
        if (locationRow) {
            const spans = Array.from(locationRow.querySelectorAll('span'))
                .filter(span => !span.classList.contains('rounded-full'));
            if (spans.length) {
                const lastSpan = spans[spans.length - 1];
                jobData.location = lastSpan.textContent.trim();
            } else {
                const text = locationRow.textContent.trim();
                if (text) {
                    jobData.location = text;
                }
            }
        }

        return jobData;
    }

    // Default extraction for studentski servis and others
    const titleElement = jobContainer.querySelector('h5');
    if (titleElement) {
        jobData.title = titleElement.textContent.trim();
    }

    const paragraphs = jobContainer.querySelectorAll('p');
    paragraphs.forEach((p, index) => {
        const text = p.textContent.trim();
        if (index === 0 && text) {
            jobData.company = text;
        } else if (index === 1 && text) {
            jobData.location = text;
        }
    });

    return jobData;
}

// Scrape all visible job data on page load
function scrapeAllJobData() {
    const jobDataList = [];

    if (isMjobSite()) {
        const jobCards = document.querySelectorAll('a.job-card, .job-card');
        jobCards.forEach(card => {
            const data = extractJobData(card);
            if (data.title || data.company || data.location) {
                jobDataList.push(data);
            }
        });
    } else {
        // For studentski servis
        const jobItems = document.querySelectorAll('article.job-item');
        jobItems.forEach(item => {
            const data = extractJobData(item);
            if (data.title || data.company || data.location) {
                jobDataList.push(data);
            }
        });
    }

    console.log("Scraped job data:", jobDataList);
    return jobDataList;
}

// Send scraped data to Firebase
async function sendToFirebase(jobDataList) {
    if (!window.db) {
        console.error("Firebase not initialized");
        return;
    }

    const collectionRef = window.db.collection('jobData');

    for (const jobData of jobDataList) {
        try {
            await collectionRef.add({
                title: jobData.title,
                company: jobData.company,
                location: jobData.location,
                scrapedAt: firebase.firestore.FieldValue.serverTimestamp(),
                site: isMjobSite() ? 'mjob' : 'studentski-servis'
            });
            console.log("Added job data to Firebase:", jobData);
        } catch (error) {
            console.error("Error adding document:", error);
        }
    }
}

// Run scraping and sending on page load
window.addEventListener('load', () => {
    setTimeout(() => {
        const data = scrapeAllJobData();
        sendToFirebase(data);
    }, 3000); // Wait a bit for page to fully load
});