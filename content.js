function extractJobData(jobContainer) {
    console.log("Extracting job data from container:", jobContainer);
    const jobData = {
        title: '',
        company: '',
        location: ''
    };

    // Extract job title from h5
    const titleElement = jobContainer.querySelector('h5');
    if (titleElement) {
        jobData.title = titleElement.textContent.trim();
    }

    // Extract company and location from p elements
    const paragraphs = jobContainer.querySelectorAll('p');
    paragraphs.forEach((p, index) => {
        const text = p.textContent.trim();
        // First p usually contains company info
        if (index === 0 && text) {
            jobData.company = text;
        }
        // Second p usually contains location
        else if (index === 1 && text) {
            jobData.location = text;
        }
    });

    return jobData;
}

function injectButton() {
    console.log("BANANA");

    const dodajButtons = document.querySelectorAll('button[sifra-data]');

    dodajButtons.forEach(dodajBtn => {
        const dBlockContainer = dodajBtn.closest(".d-block");
        if (!dBlockContainer) return;

        // Prevent duplicates
        if (dBlockContainer.querySelector(".my-stars-div")) return;

        // Find the parent container with job info (col-12 col-md-8 px-0 pr-md-2)
        const jobInfoContainer = dBlockContainer.closest("article.job-item")?.querySelector(".col-12.col-md-8") || dBlockContainer.closest("[class*='col-12'][class*='col-md-8']");

        const wrapper = document.createElement("div");
        wrapper.className = "job-actions col-12 mb-1 ml-auto px-0 my-stars-div";

        const btn = document.createElement("button");
        btn.className = "btn btn-action ml-auto";
        btn.innerHTML = "★★★★★";
        btn.style.fontSize = "16px";

        btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const jobData = extractJobData(jobInfoContainer || dBlockContainer);
            showReviewModal(jobData);
        };

        wrapper.appendChild(btn);

        const allJobsDiv = dBlockContainer.querySelector("a[href*='vsadelapodj']")?.closest(".job-actions");

        if (allJobsDiv) {
            allJobsDiv.insertAdjacentElement("afterend", wrapper);
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
        stylesheet.href = chrome.runtime.getURL('popUpStyle.css');
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