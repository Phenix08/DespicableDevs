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

function isMjobSite() {
    return window.location.host.includes('mjob');
}

function ensureMjobStarHoverStyles() {
    if (!isMjobSite() || document.getElementById('despicable-devs-mjob-star-style')) return;

    const style = document.createElement('style');
    style.id = 'despicable-devs-mjob-star-style';
    style.textContent = `
        button.mjob-review-stars-btn {
            border: 1px solid transparent;
            border-radius: 0.65rem;
            padding: 0.18rem 0.55rem;
            margin-left: 0.4rem;
            transition: border 0.18s ease, background-color 0.18s ease;
        }
        button.mjob-review-stars-btn:hover {
            border-bottom: 2px solid black;
            border-left: 2px solid black;
            background-color: rgba(255, 255, 255, 0.95);
        }
    `;
    document.head.appendChild(style);
}

function observeMjobJobRows() {
    if (!isMjobSite() || !document.body) return;

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;

                if (node.matches('div.flex.items-center.gap-4.text-[14px], a.job-card, .job-card') || node.querySelector('div.flex.items-center.gap-4.text-[14px]')) {
                    injectButton();
                    return;
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function injectButton() {
    console.log("BANANA");

    if (isMjobSite()) {
        ensureMjobStarHoverStyles();
        const targetRows = Array.from(document.querySelectorAll('div.flex.items-center.gap-4')).filter(el => el.classList.contains('text-[14px]'));

        targetRows.forEach(row => {
            if (row.querySelector('.my-stars-div')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'job-actions col-12 mb-1 ml-auto px-0 my-stars-div';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.marginLeft = 'auto';

            const btn = document.createElement('button');
            btn.className = 'btn btn-action ml-auto mjob-review-stars-btn';
            btn.innerHTML = '★★★★★';
            btn.style.fontSize = '16px';

            btn.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                const jobData = extractJobData(row.closest('article.job-item') || row);
                showReviewModal(jobData);
            };

            wrapper.appendChild(btn);
            row.appendChild(wrapper);
        });

        return;
    }

    const dodajButtons = document.querySelectorAll('button[sifra-data]');

    dodajButtons.forEach(dodajBtn => {
        const dBlockContainer = dodajBtn.closest('.d-block');
        if (!dBlockContainer) return;

        // Prevent duplicates
        if (dBlockContainer.querySelector('.my-stars-div')) return;

        // Find the parent container with job info (col-12 col-md-8 px-0 pr-md-2)
        const jobInfoContainer = dBlockContainer.closest('article.job-item')?.querySelector('.col-12.col-md-8') || dBlockContainer.closest("[class*='col-12'][class*='col-md-8']");

        const wrapper = document.createElement('div');
        wrapper.className = 'job-actions col-12 mb-1 ml-auto px-0 my-stars-div';

        const btn = document.createElement('button');
        btn.className = 'btn btn-action ml-auto';
        btn.innerHTML = '★★★★★';
        btn.style.fontSize = '16px';

        btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const jobData = extractJobData(jobInfoContainer || dBlockContainer);
            showReviewModal(jobData);
        };

        wrapper.appendChild(btn);

        const allJobsDiv = dBlockContainer.querySelector("a[href*='vsadelapodj']")?.closest('.job-actions');

        if (allJobsDiv) {
            allJobsDiv.insertAdjacentElement('afterend', wrapper);
        } else {
            dBlockContainer.appendChild(wrapper);
        }
    });
}

let popupTemplates = {};

function getPopupTemplate(templateName) {
    if (popupTemplates[templateName]) {
        return Promise.resolve(popupTemplates[templateName]);
    }

    const url = chrome.runtime.getURL(templateName);
    console.log('Loading template from', url);

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load ' + templateName + ': ' + response.status);
            }
            return response.text();
        })
        .then(template => {
            popupTemplates[templateName] = template;
            return template;
        });
}

function extractWebsiteStyles() {
    // Extract styles from the website to match its aesthetic
    const rootStyle = window.getComputedStyle(document.documentElement);

    const rootPrimary = rootStyle.getPropertyValue('--primary').trim();
    const rootText = rootStyle.getPropertyValue('--dark').trim() || rootStyle.getPropertyValue('--gray-dark').trim();
    const rootFont = rootStyle.getPropertyValue('--font-family-sans-serif').trim();
    const rootBackground = rootStyle.getPropertyValue('--light').trim();
    const rootBorder = rootStyle.getPropertyValue('--gray').trim();

    let primaryColor = rootPrimary || '#8BC832';
    let textColor = rootText || '#000000';
    let fontFamily = rootFont || 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    let backgroundColor = rootBackground || '#F0F3F5';
    let borderColor = rootBorder || '#dfe3e8';

    try {
        const bodyStyle = window.getComputedStyle(document.body);
        if (!rootText) textColor = bodyStyle.color || textColor;
        if (!rootFont) fontFamily = bodyStyle.fontFamily || fontFamily;

        const primaryBtn = document.querySelector('button, .btn-primary, [class*="primary"]');
        if (primaryBtn) {
            const btnColor = window.getComputedStyle(primaryBtn).backgroundColor;
            if (btnColor && btnColor !== 'rgba(0, 0, 0, 0)') {
                primaryColor = btnColor;
            }
        }

        const mainContent = document.querySelector('main, .container, [class*="content"]');
        if (mainContent) {
            const bg = window.getComputedStyle(mainContent).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)') {
                backgroundColor = bg;
            }
        }

        const commonElement = document.querySelector('input, textarea, select, [class*="border"]');
        if (commonElement) {
            const border = window.getComputedStyle(commonElement).borderColor;
            if (border && border !== 'rgba(0, 0, 0, 0)') {
                borderColor = border;
            }
        }
    } catch (e) {
        console.log('Could not extract all styles, using defaults');
    }

    return {
        primaryColor,
        textColor,
        fontFamily,
        backgroundColor,
        borderColor
    };
}

function showReviewModal(jobData = {}) {
    // Remove existing modal if present
    const existingModal = document.getElementById('review-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Extract website styles
    const websiteStyles = extractWebsiteStyles();

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'review-modal-overlay';

    // Add overlay immediately so it exists before template insertion
    document.body.appendChild(modalOverlay);

    const styleVars = document.createElement('style');
    styleVars.id = 'review-popup-css-vars';
    styleVars.textContent = `
        :root {
            --primary-color: ${websiteStyles.primaryColor};
            --text-color: ${websiteStyles.textColor};
            --font-family: ${websiteStyles.fontFamily};
            --background-color: ${websiteStyles.backgroundColor};
            --surface-color: #ffffff;
            --border-color: ${websiteStyles.borderColor};
            --muted-color: rgba(0, 0, 0, 0.6);
            --overlay-color: rgba(0, 0, 0, 0.35);
        }
    `;
    document.head.appendChild(styleVars);

    let stylesheet = document.getElementById('review-popup-stylesheet');
    if (!stylesheet) {
        stylesheet = document.createElement('link');
        stylesheet.id = 'review-popup-stylesheet';
        stylesheet.rel = 'stylesheet';
        stylesheet.href = chrome.runtime.getURL(isMjobSite() ? 'popUpStyle-mjob.css' : 'popUpStyle.css');
        document.head.appendChild(stylesheet);
    }

    document.body.appendChild(modalOverlay);

    getPopupTemplate('reviewPopup.html').then(template => {
        modalOverlay.innerHTML = template;

        // Update header with job data
        const headerTitle = modalOverlay.querySelector('#review-modal-header h2');
        if (headerTitle && jobData.title) {
            headerTitle.innerHTML = `${jobData.title}<br><span style="font-size: 0.8rem; font-weight: 400; color: var(--muted-color);">${jobData.company}${jobData.location ? ' • ' + jobData.location : ''}</span>`;
        }

        // Add thumbs up functionality
        const thumbsUpButtons = modalOverlay.querySelectorAll('.thumbs-up-btn');
        thumbsUpButtons.forEach(button => {
            button.addEventListener('click', function() {
                const isUpvoted = this.getAttribute('data-upvoted') === 'true';
                const currentCount = parseInt(this.textContent.split(' ')[1]);

                if (isUpvoted) {
                    // Remove upvote
                    this.setAttribute('data-upvoted', 'false');
                    this.textContent = `👍 ${currentCount - 1}`;
                } else {
                    // Add upvote
                    this.setAttribute('data-upvoted', 'true');
                    this.textContent = `👍 ${currentCount + 1}`;
                }
            });
        });

        document.getElementById('review-modal-close').onclick = () => {
            modalOverlay.remove();
            styleVars.remove();
        };

        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
                styleVars.remove();
            }
        };

        document.addEventListener('keydown', function closeOnEscape(e) {
            if (e.key === 'Escape') {
                modalOverlay.remove();
                styleVars.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        });
    }).catch(error => {
        console.error('Could not load review template', error);
    });
}

injectButton();
setInterval(injectButton, 2000);
observeMjobJobRows();
document.body.addEventListener('click', () => {
    if (isMjobSite()) {
        setTimeout(injectButton, 600);
    }
});

injectButton();
setInterval(injectButton, 2000);
observeMjobJobRows();
document.body.addEventListener('click', () => {
    if (isMjobSite()) {
        setTimeout(injectButton, 600);
    }
});