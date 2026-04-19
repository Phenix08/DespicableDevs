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

function ensureInjectedStarLogoStyles() {
    if (document.getElementById('despicable-devs-star-logo-style')) return;

    const style = document.createElement('style');
    style.id = 'despicable-devs-star-logo-style';
    style.textContent = `
        .extension-review-stars-logo {
            display: block;
            width: 8.58em;
            height: 1.65em;
            margin-left: auto;
            background-color: currentColor;
            -webkit-mask-image: url("${chrome.runtime.getURL('Logos/LogoName.svg')}");
            -webkit-mask-repeat: no-repeat;
            -webkit-mask-size: contain;
            -webkit-mask-position: right center;
            mask-image: url("${chrome.runtime.getURL('Logos/LogoName.svg')}");
            mask-repeat: no-repeat;
            mask-size: contain;
            mask-position: right center;
            vertical-align: middle;
        }
    `;
    document.head.appendChild(style);
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

                const isJobCardNode = node.matches('a.job-card, .job-card');
                const isLocationRowNode = node.matches('div.flex.items-center.gap-4') && node.classList.contains('text-[14px]');
                const hasLocationRowDescendant = Array.from(node.querySelectorAll('div.flex.items-center.gap-4')).some(el => el.classList.contains('text-[14px]'));

                if (isJobCardNode || isLocationRowNode || hasLocationRowDescendant) {
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
    ensureInjectedStarLogoStyles();

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
            btn.innerHTML = '<span class="extension-review-stars-logo" aria-hidden="true"></span>';
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
        btn.innerHTML = '<span class="extension-review-stars-logo" aria-hidden="true"></span>';
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
    let fontFamily = rootFont ? `Montserrat, ${rootFont}` : 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
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

function initializeInlineAutocomplete(container, inputId, dropdownId, options) {
    const input = container.querySelector('#' + inputId);
    const dropdown = container.querySelector('#' + dropdownId);
    if (!input || !dropdown) return;

    function filterAndRender(searchTerm) {
        const filtered = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
        dropdown.innerHTML = '';

        const listToShow = searchTerm === '' ? options : filtered;
        if (listToShow.length === 0) {
            dropdown.innerHTML = '<div style="padding: 0.6rem 0.75rem; color: #999;">No matches found</div>';
            dropdown.classList.add('active');
            return;
        }

        listToShow.forEach(opt => {
            const optionNode = document.createElement('div');
            optionNode.className = 'autocomplete-option';
            optionNode.textContent = opt;
            optionNode.onclick = (e) => {
                e.stopPropagation();
                input.value = opt;
                dropdown.classList.remove('active');
            };
            dropdown.appendChild(optionNode);
        });

        dropdown.classList.add('active');
    }

    input.addEventListener('focus', () => filterAndRender(input.value.trim()));
    input.addEventListener('input', () => filterAndRender(input.value.trim()));
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== input) {
            dropdown.classList.remove('active');
        }
    });
}

function setupInlineStars(modalOverlay, selector) {
    const container = modalOverlay.querySelector(selector);
    if (!container) return () => 0;

    const stars = container.querySelectorAll('span');
    let selected = 0;

    const update = () => {
        stars.forEach(star => {
            const value = parseInt(star.dataset.value, 10);
            star.classList.toggle('active', value <= selected);
        });
    };

    stars.forEach(star => {
        star.addEventListener('click', () => {
            selected = parseInt(star.dataset.value, 10);
            update();
        });
    });

    update();
    return () => selected;
}

async function postInlineReviewFromForm(reviewData) {
    const isAnonymous = reviewData.anonymous === true;
    const user = (reviewData.user || '').trim();

    const payload = {
        company: reviewData.company,
        title: reviewData.jobTitle,
        location: reviewData.location,
        overall_rating: reviewData.overall,
        work_environment: reviewData.sub1,
        location_rating: reviewData.sub2,
        communication: reviewData.sub3,
        flexibility: reviewData.sub4,
        comment: reviewData.comment,
        isAnonymous: isAnonymous,
        didApply: reviewData.didApply === true,
        didWork: reviewData.didWork === true,
        user: user
    };

    return new Promise((resolve) => {
        console.log('Sending review payload to backend (inline form):', payload);
        chrome.runtime.sendMessage({ type: 'postReviewData', reviewData: payload }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            resolve(response || { success: false, error: 'No response from background' });
        });
    });
}

function wireInlineAddReview(modalOverlay, jobData) {
    const titleInput = modalOverlay.querySelector('#inline-job-title-input');
    const companyInput = modalOverlay.querySelector('#inline-company-input');
    const locationInput = modalOverlay.querySelector('#inline-location-input');
    const commentInput = modalOverlay.querySelector('#inline-review-comment');

    if (titleInput && jobData.title) titleInput.value = jobData.title;
    if (companyInput && jobData.company) companyInput.value = jobData.company;
    if (locationInput && jobData.location) locationInput.value = jobData.location;

    if (titleInput) titleInput.readOnly = true;
    if (companyInput) companyInput.readOnly = true;
    if (locationInput) locationInput.readOnly = true;

    const getOverall = setupInlineStars(modalOverlay, '[data-target="inline-overall"]');
    const getSub1 = setupInlineStars(modalOverlay, '[data-target="inline-sub1"]');
    const getSub2 = setupInlineStars(modalOverlay, '[data-target="inline-sub2"]');
    const getSub3 = setupInlineStars(modalOverlay, '[data-target="inline-sub3"]');
    const getSub4 = setupInlineStars(modalOverlay, '[data-target="inline-sub4"]');

    const saveBtn = modalOverlay.querySelector('.inline-save-review-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async (event) => {
        event.preventDefault();

        const reviewData = {
            company: companyInput?.value.trim() || '',
            jobTitle: titleInput?.value.trim() || '',
            location: locationInput?.value.trim() || '',
            overall: getOverall(),
            sub1: getSub1(),
            sub2: getSub2(),
            sub3: getSub3(),
            sub4: getSub4(),
            comment: commentInput?.value.trim() || '',
            anonymous: false,
            user: "sara.strakl4@gmail.com"
        };

        if (!reviewData.company || !reviewData.jobTitle || !reviewData.location) {
            alert('Fill in Job Title, Company and Location');
            return;
        }

        if (!reviewData.overall || !reviewData.sub1 || !reviewData.sub2 || !reviewData.sub3 || !reviewData.sub4) {
            alert('Please rate all categories (Overall and all detailed ratings)');
            return;
        }

        const storageKey = 'inline_review_' + [reviewData.company, reviewData.jobTitle, reviewData.location].join('::');
        localStorage.setItem(storageKey, JSON.stringify(reviewData));
        console.log('Saved inline review:', reviewData);

        const postResult = await postInlineReviewFromForm(reviewData);
        if (!postResult?.success) {
            console.warn('Failed to post inline review:', postResult?.error || 'Unknown error');
        }

        alert('Review saved successfully!');
    });
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

        wireInlineAddReview(modalOverlay, jobData);

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