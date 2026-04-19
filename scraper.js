function isMjobSite() {
    return window.location.host.includes('mjob');
}

function extractJobData(jobContainer) {
    /*console.log("Extracting job data from container:", jobContainer);*/
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

const scrapedJobCards = new WeakSet();
const scrapedStudentJobItems = new WeakSet();

function findMjobJobCards() {
    return Array.from(document.querySelectorAll('a.job-card, .job-card, a[class*="job-card"], [class*="job-card"]'))
        .filter(el => !el.closest('.my-stars-div'));
}

function findStudentskiJobItems() {
    return Array.from(document.querySelectorAll('article.job-item, [class*="job-item"]'))
        .filter(el => el.querySelector('button[sifra-data]'));
}

function postJobData(jobData) {
    return new Promise(resolve => {
        /*console.log('Sending job data to background:', jobData);*/
        chrome.runtime.sendMessage({ type: 'postJobData', jobData }, response => {
            if (chrome.runtime.lastError) {
                console.error('Background message error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
                return;
            }

            if (!response || !response.success) {
                console.error('Background failed to post job data:', response?.error);
                resolve({ success: false, error: response?.error || 'Unknown error' });
                return;
            }

            /*console.log('Background successfully posted job data');*/
            resolve({ success: true });
        });
    });
}

async function scrapeJobs({ newOnly = false } = {}) {
    /*console.log("Starting job scraping...");*/

    if (isMjobSite()) {
        /*console.log("Detected mjob.si site. Scraping job cards...");*/

        let attempts = 0;
        const maxAttempts = 8;

        const tryScrape = async () => {
            let jobCards = findMjobJobCards();
            if (newOnly) {
                jobCards = jobCards.filter(card => !scrapedJobCards.has(card));
            }

            /*console.log(`Found ${jobCards.length} job cards${newOnly ? ' (new only)' : ''}.`);*/

            if (!newOnly && jobCards.length === 0 && attempts < maxAttempts) {
                attempts += 1;
                /*console.log(`No job cards yet, retrying in 500ms (attempt ${attempts}/${maxAttempts})`);*/
                setTimeout(() => tryScrape(), 500);
                return;
            }

            for (const [index, card] of jobCards.entries()) {
                const jobData = extractJobData(card);
                /*console.log(`Job ${index + 1}: Title: "${jobData.title}", Company: "${jobData.company}", Location: "${jobData.location}"`);*/
                scrapedJobCards.add(card);
                postJobData(jobData);
            }

            if (jobCards.length === 0 && !newOnly) {
                /*console.log('No job cards found after retrying.');*/
            }
        };

        await tryScrape();
    } else {
        /*console.log("Detected studentski-servis site. Scraping job items...");*/

        let jobItems = findStudentskiJobItems();
        if (newOnly) {
            jobItems = jobItems.filter(item => !scrapedStudentJobItems.has(item));
        }

        /*console.log(`Found ${jobItems.length} studentski job items${newOnly ? ' (new only)' : ''}.`);*/

        for (const [index, item] of jobItems.entries()) {
            const jobInfoContainer = item.querySelector('.col-12.col-md-8') || item.querySelector("[class*='col-12'][class*='col-md-8']") || item;
            const jobData = extractJobData(jobInfoContainer || item);
            /*console.log(`Job ${index + 1}: Title: "${jobData.title}", Company: "${jobData.company}", Location: "${jobData.location}"`);*/
            scrapedStudentJobItems.add(item);
            postJobData(jobData);
        }

        if (jobItems.length === 0 && !newOnly) {
            const dodajButtons = document.querySelectorAll('button[sifra-data]');
            for (const [index, dodajBtn] of Array.from(dodajButtons).entries()) {
                const dBlockContainer = dodajBtn.closest('.d-block');
                if (!dBlockContainer) continue;

                const jobInfoContainer = dBlockContainer.closest('article.job-item')?.querySelector('.col-12.col-md-8') || dBlockContainer.closest("[class*='col-12'][class*='col-md-8']");
                const jobData = extractJobData(jobInfoContainer || dBlockContainer);
                /*console.log(`Job ${index + 1}: Title: "${jobData.title}", Company: "${jobData.company}", Location: "${jobData.location}"`);*/
                postJobData(jobData);
            }
        }
    }

    /*console.log("Job scraping completed.");*/

    window.dispatchEvent(new CustomEvent('despicable-jobs-scraped', {
        detail: { newOnly }
    }));
}

function observeJobChanges() {
    let scrapeTimeout = null;

    const observer = new MutationObserver(mutations => {
        let foundNew = false;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;

                if (isMjobSite()) {
                    if (node.matches('a.job-card, .job-card, a[class*="job-card"], [class*="job-card"]') || node.querySelector('a.job-card, .job-card, a[class*="job-card"], [class*="job-card"]')) {
                        foundNew = true;
                        break;
                    }
                } else {
                    if (node.matches('article.job-item, [class*="job-item"]') || node.querySelector('article.job-item, [class*="job-item"]') || node.querySelector('button[sifra-data]')) {
                        foundNew = true;
                        break;
                    }
                }
            }
            if (foundNew) break;
        }

        if (foundNew) {
            if (scrapeTimeout) {
                clearTimeout(scrapeTimeout);
            }
            scrapeTimeout = setTimeout(() => {
                scrapeJobs({ newOnly: true });
            }, 700);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener('load', () => {
    scrapeJobs({ newOnly: false });
    observeJobChanges();
});