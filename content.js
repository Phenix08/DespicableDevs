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

function isMjobSite() {
    return window.location.host.includes('mjob');
}

const reviewAverageCache = new Map();
const reviewSummaryCache = new Map();
const reviewSummaryInFlight = new Map();
const FALLBACK_CURRENT_USER_EMAIL = 'sara.strakl4@gmail.com';

function normalizeCompanyForLookup(name) {
    if (!name) return '';

    let normalized = String(name).toUpperCase();
    const suffixes = [
        /\bD\s*\.?\s*O\s*\.?\s*O\s*\.?\b/g,
        /\bD\s*\.?\s*D\s*\.?\b/g,
        /\bS\s*\.?\s*P\s*\.?\b/g,
        /\bD\s*\.?\s*N\s*\.?\s*O\s*\.?\b/g
    ];

    suffixes.forEach((suffix) => {
        normalized = normalized.replace(suffix, '');
    });

    normalized = normalized.replace(/[^\w\s]/g, ' ');
    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized;
}

function toUpperTrim(value) {
    return (value || '').trim().toUpperCase();
}

function buildReviewLookupParams(jobData) {
    return {
        company: normalizeCompanyForLookup(jobData.company),
        position: toUpperTrim(jobData.title),
        location: toUpperTrim(jobData.location)
    };
}

function getListingCacheKey(jobData) {
    const params = buildReviewLookupParams(jobData);
    return {
        params,
        cacheKey: `${params.company}::${params.position}::${params.location}`
    };
}

function invalidateListingReviewCache(jobData) {
    const { cacheKey } = getListingCacheKey(jobData);
    reviewSummaryCache.delete(cacheKey);
    reviewAverageCache.delete(cacheKey);
    reviewSummaryInFlight.delete(cacheKey);
}

function getCurrentUserIdentity() {
    const identity = {
        email: '',
        uid: '',
        displayName: ''
    };

    const localEmail = (localStorage.getItem('currentUserEmail')
        || localStorage.getItem('userEmail')
        || localStorage.getItem('email')
        || '').trim();
    if (localEmail) identity.email = localEmail;

    const firebaseKey = Object.keys(localStorage).find((key) => key.startsWith('firebase:authUser:'));
    if (firebaseKey) {
        try {
            const authData = JSON.parse(localStorage.getItem(firebaseKey) || '{}');
            if (!identity.email && typeof authData?.email === 'string') {
                identity.email = authData.email.trim();
            }
            if (typeof authData?.uid === 'string') {
                identity.uid = authData.uid.trim();
            }
            if (typeof authData?.displayName === 'string') {
                identity.displayName = authData.displayName.trim();
            }
        } catch (error) {
            // Ignore parse errors and use fallbacks.
        }
    }

    if (!identity.email) {
        identity.email = FALLBACK_CURRENT_USER_EMAIL;
    }

    return identity;
}

function normalizeIdentityValue(value) {
    return String(value || '').trim().toLowerCase();
}

function buildInlineReviewStorageKey(jobData) {
    return `inline_review_${(jobData?.company || '').trim()}::${(jobData?.title || '').trim()}::${(jobData?.location || '').trim()}`;
}

function getLocalInlineReview(jobData) {
    try {
        const localKey = buildInlineReviewStorageKey(jobData);
        const raw = localStorage.getItem(localKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
        return null;
    }
}

function reviewBelongsToCurrentUser(review, identity) {
    const currentEmail = normalizeIdentityValue(identity?.email);
    const currentUid = String(identity?.uid || '').trim();
    const currentDisplayName = normalizeIdentityValue(identity?.displayName);

    const emailCandidates = [
        review?.email,
        review?.user_email,
        review?.userEmail,
        review?.authorEmail,
        review?.user
    ].map(normalizeIdentityValue).filter(Boolean);

    const uidCandidates = [
        review?.uid,
        review?.user_id,
        review?.userId,
        review?.authorId,
        review?.user
    ].map((v) => String(v || '').trim()).filter(Boolean);

    const nameCandidates = [
        review?.display_name,
        review?.displayName,
        review?.user_name,
        review?.user
    ].map(normalizeIdentityValue).filter(Boolean);

    if (currentEmail && emailCandidates.includes(currentEmail)) return true;
    if (currentUid && uidCandidates.includes(currentUid)) return true;
    if (currentDisplayName && nameCandidates.includes(currentDisplayName)) return true;
    return false;
}

function getCurrentUserReview(summary, jobData) {
    const reviews = Array.isArray(summary?.reviews) ? summary.reviews : [];
    const identity = getCurrentUserIdentity();

    const matchedBackendReview = reviews.find((review) => reviewBelongsToCurrentUser(review, identity));
    if (matchedBackendReview) {
        return matchedBackendReview;
    }

    return getLocalInlineReview(jobData);
}

function hasCurrentUserReviewed(summary, jobData) {
    return Boolean(getCurrentUserReview(summary, jobData));
}

function updateReviewDisclosureLabel(modalOverlay, shouldEdit) {
    const summaryNode = modalOverlay.querySelector('.add-review-summary');
    if (summaryNode) {
        summaryNode.textContent = shouldEdit ? 'Edit your review' : 'Add your review';
    }

    const inlineActionBtn = modalOverlay.querySelector('.inline-save-review-btn');
    if (inlineActionBtn) {
        inlineActionBtn.textContent = shouldEdit ? 'Save Changes' : 'Add Review';
    }
}

function applyAverageStars(starsRoot, averageRating) {
    if (!starsRoot) return;

    const clamped = Number.isFinite(averageRating)
        ? Math.max(0, Math.min(5, averageRating))
        : 0;

    const fill = starsRoot.querySelector('.stars-fill');
    if (fill) {
        fill.style.width = `${(clamped / 5) * 100}%`;
    }

    starsRoot.title = clamped > 0 ? `Average rating: ${clamped.toFixed(2)} / 5` : 'No reviews yet';
}

async function fetchListingAverageRating(jobData) {
    const forceRefresh = jobData?.forceRefresh === true;
    const summary = await fetchListingReviewSummary(jobData, { forceRefresh });
    if (!summary) return null;

    const overall = Number(summary?.averages?.overall);
    return Number.isFinite(overall) ? overall : null;
}

async function fetchListingReviewSummary(jobData, { forceRefresh = false } = {}) {
    const { params, cacheKey } = getListingCacheKey(jobData);

    if (!params.company || !params.position || !params.location) {
        console.warn('Skipping review lookup due to missing params:', {
            extractedJobData: jobData,
            lookupParams: params
        });
        return null;
    }

    if (!forceRefresh && reviewSummaryCache.has(cacheKey)) {
        return reviewSummaryCache.get(cacheKey);
    }

    if (reviewSummaryInFlight.has(cacheKey)) {
        return reviewSummaryInFlight.get(cacheKey);
    }

    const pendingRequest = new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'getReviewData', params }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            resolve(response || { success: false, error: 'No response from background' });
        });
    })
        .then((result) => {
            if (!result?.success) {
                console.warn('Review lookup failed:', {
                    lookupParams: params,
                    error: result?.error,
                    status: result?.status,
                    rawResponse: result
                });
                reviewSummaryCache.set(cacheKey, null);
                reviewAverageCache.set(cacheKey, null);
                return null;
            }

            /*console.log('Reviews received for listing lookup:', params, result?.data?.reviews || []);*/

            const overall = Number(result?.data?.averages?.overall);
            const parsed = Number.isFinite(overall) ? overall : null;
            reviewSummaryCache.set(cacheKey, result.data || null);
            reviewAverageCache.set(cacheKey, parsed);
            return result.data || null;
        })
        .finally(() => {
            reviewSummaryInFlight.delete(cacheKey);
        });

    reviewSummaryInFlight.set(cacheKey, pendingRequest);
    return pendingRequest;
}

function renderPopupAverageData(modalOverlay, summary) {
    const averages = summary?.averages || {};
    const reviews = Array.isArray(summary?.reviews) ? summary.reviews : [];
    const overall = Number(averages.overall);

    const starsContainer = modalOverlay.querySelector('.stars');
    if (starsContainer) {
        starsContainer.innerHTML = '<span class="popup-overall-badge"><span class="popup-overall-logo" aria-hidden="true"></span><span class="popup-overall-stars extension-review-stars-text"><span class="stars-base">★★★★★</span><span class="stars-fill">★★★★★</span></span></span>';
        const starsRoot = starsContainer.querySelector('.popup-overall-stars');
        applyAverageStars(starsRoot, overall);
    }

    const reviewCountNode = modalOverlay.querySelector('.review-count');
    if (reviewCountNode) {
        const count = reviews.length;
        reviewCountNode.textContent = `Based on ${count} review${count === 1 ? '' : 's'}`;
    }

    const orderedAverages = [
        Number(averages.work_environment),
        Number(averages.location),
        Number(averages.communication),
        Number(averages.flexibility)
    ];

    const barFills = modalOverlay.querySelectorAll('.rating-bar .bar-fill');
    const barValues = modalOverlay.querySelectorAll('.rating-bar .bar-value');
    barFills.forEach((barFill, index) => {
        const value = orderedAverages[index];
        const clamped = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
        barFill.style.width = `${(clamped / 5) * 100}%`;

        const valueNode = barValues[index];
        if (valueNode) {
            valueNode.textContent = Number.isFinite(value) ? clamped.toFixed(1) : '-';
        }
    });
}

function getReviewRating(review) {
    const raw = Number(review?.rating ?? review?.overall_rating ?? 0);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(5, raw));
}

function formatReviewDate(value) {
    if (!value) return 'Unknown date';

    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime())
            ? value
            : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    }

    if (typeof value === 'object') {
        const seconds = value._seconds ?? value.seconds;
        if (typeof seconds === 'number') {
            const parsed = new Date(seconds * 1000);
            return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
        }
    }

    return 'Unknown date';
}

function toBooleanFlag(value) {
    if (value === true) return true;
    if (typeof value === 'string') {
        return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
    }
    if (typeof value === 'number') return value !== 0;
    return false;
}

function getReviewerStatus(review) {
    if (toBooleanFlag(review?.worked)) {
        return { label: 'worked here', type: 'worked' };
    }
    if (toBooleanFlag(review?.applied)) {
        return { label: 'applied', type: 'applied' };
    }
    return null;
}

function wireThumbsUpButtons(modalOverlay) {
    const thumbsUpButtons = modalOverlay.querySelectorAll('.thumbs-up-btn');
    thumbsUpButtons.forEach((button) => {
        button.addEventListener('click', function onThumbsUpClick() {
            const isUpvoted = this.getAttribute('data-upvoted') === 'true';
            const currentCount = parseInt(this.textContent.split(' ')[1], 10) || 0;

            if (isUpvoted) {
                this.setAttribute('data-upvoted', 'false');
                this.textContent = `👍 ${Math.max(0, currentCount - 1)}`;
            } else {
                this.setAttribute('data-upvoted', 'true');
                this.textContent = `👍 ${currentCount + 1}`;
            }
        });
    });
}

function renderPopupComments(modalOverlay, summary) {
    const commentsSection = modalOverlay.querySelector('.comments-section');
    if (!commentsSection) return;

    const reviews = Array.isArray(summary?.reviews) ? summary.reviews : [];
    commentsSection.querySelectorAll('.comment').forEach((node) => node.remove());

    if (reviews.length === 0) {
        const emptyNode = document.createElement('div');
        emptyNode.className = 'comment';
        emptyNode.textContent = 'No reviews yet for this listing.';
        commentsSection.appendChild(emptyNode);
        return;
    }

    reviews.forEach((review) => {
        const rating = getReviewRating(review);
        const filled = Math.round(rating);
        const starsText = '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(filled);

        const commentNode = document.createElement('div');
        commentNode.className = 'comment';

        const header = document.createElement('div');
        header.className = 'comment-header';

        const username = document.createElement('div');
        username.className = 'comment-username';
        username.textContent = review?.user || 'Anonymous';

        const reviewerStatus = getReviewerStatus(review);
        if (reviewerStatus) {
            const statusBadge = document.createElement('span');
            statusBadge.className = `comment-status-badge ${reviewerStatus.type}`;

            const statusIcon = document.createElement('span');
            statusIcon.className = 'comment-status-icon';
            statusIcon.setAttribute('aria-hidden', 'true');

            const statusText = document.createElement('span');
            statusText.textContent = reviewerStatus.label;

            statusBadge.appendChild(statusIcon);
            statusBadge.appendChild(statusText);
            username.appendChild(statusBadge);
        }

        const stars = document.createElement('div');
        stars.className = 'comment-stars';
        stars.textContent = starsText;

        header.appendChild(username);
        header.appendChild(stars);

        const body = document.createElement('div');
        body.className = 'comment-text';
        body.textContent = review?.comment || '';

        const footer = document.createElement('div');
        footer.className = 'comment-footer';

        const date = document.createElement('span');
        date.className = 'comment-date';
        date.textContent = formatReviewDate(review?.date);

        const likesCount = Number(review?.likes);
        const thumbsUp = document.createElement('button');
        thumbsUp.className = 'thumbs-up-btn';
        thumbsUp.setAttribute('data-upvoted', 'false');
        thumbsUp.textContent = `👍 ${Number.isFinite(likesCount) ? likesCount : 0}`;

        footer.appendChild(date);
        footer.appendChild(thumbsUp);

        commentNode.appendChild(header);
        commentNode.appendChild(body);
        commentNode.appendChild(footer);
        commentsSection.appendChild(commentNode);
    });

    wireThumbsUpButtons(modalOverlay);
}

function updateButtonAverageStars(btn, jobData) {
    const starsRoot = btn.querySelector('.extension-review-stars-text');
    if (!starsRoot) return;

    fetchListingAverageRating(jobData)
        .then((avg) => {
            applyAverageStars(starsRoot, avg);
        })
        .catch((error) => {
            console.warn('Failed to update listing average stars', error);
            applyAverageStars(starsRoot, null);
        });
}

function refreshStudentskiListingStars({ forceRefresh = false } = {}) {
    if (isMjobSite()) return;

    const wrappers = document.querySelectorAll('.my-stars-div');
    wrappers.forEach(wrapper => {
        const btn = wrapper.querySelector('button.studentski-review-stars-btn');
        if (!btn) return;

        const dBlockContainer = wrapper.closest('.d-block');
        if (!dBlockContainer) return;

        const jobInfoContainer = dBlockContainer.closest('article.job-item')?.querySelector('.col-12.col-md-8')
            || dBlockContainer.closest("[class*='col-12'][class*='col-md-8']")
            || dBlockContainer;

        const extracted = extractJobData(jobInfoContainer || dBlockContainer);
        updateButtonAverageStars(btn, { ...extracted, forceRefresh });
    });
}

function ensureInjectedStarLogoStyles() {
    if (document.getElementById('despicable-devs-star-logo-style')) return;

    const style = document.createElement('style');
    style.id = 'despicable-devs-star-logo-style';
    style.textContent = `
        button.studentski-review-stars-btn {
            color: #8a8a8a;
            transition: color 0.18s ease;
        }
        button.studentski-review-stars-btn:hover {
            color: #000000;
        }
        .extension-review-stars-badge {
            display: inline-flex;
            flex-direction: column;
            align-items: flex-end;
            line-height: 1;
        }
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
        .extension-review-stars-text {
            position: relative;
            display: inline-block;
            margin-top: 0.16em;
            margin-right: 0.06em;
            font-size: 1.05em;
            letter-spacing: 0.09em;
            font-weight: 700;
            line-height: 1;
            width: max-content;
        }
        .extension-review-stars-text .stars-base {
            color: currentColor;
            opacity: 0.28;
        }
        .extension-review-stars-text .stars-fill {
            position: absolute;
            left: 0;
            top: 0;
            color: currentColor;
            overflow: hidden;
            white-space: nowrap;
            width: 100%;
        }
        .popup-overall-badge {
            display: inline-flex;
            flex-direction: column;
            align-items: flex-start;
            line-height: 1;
        }
        .popup-overall-logo {
            display: block;
            width: 8.9em;
            height: 1.72em;
            background-color: #000000;
            -webkit-mask-image: url("${chrome.runtime.getURL('Logos/LogoName.svg')}");
            -webkit-mask-repeat: no-repeat;
            -webkit-mask-size: contain;
            -webkit-mask-position: left center;
            mask-image: url("${chrome.runtime.getURL('Logos/LogoName.svg')}");
            mask-repeat: no-repeat;
            mask-size: contain;
            mask-position: left center;
        }
        .popup-overall-stars {
            margin-top: 0.16em;
            font-size: 1.16em;
            color: var(--primary-color);
        }
        .comment-status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.28rem;
            margin-left: 0.45rem;
            font-style: italic;
            font-size: 0.82em;
        }
        .comment-status-icon {
            width: 0.95em;
            height: 0.95em;
            display: inline-block;
            background-color: currentColor;
            -webkit-mask-image: url("${chrome.runtime.getURL('Logos/Logo.svg')}");
            -webkit-mask-repeat: no-repeat;
            -webkit-mask-size: contain;
            -webkit-mask-position: center;
            mask-image: url("${chrome.runtime.getURL('Logos/Logo.svg')}");
            mask-repeat: no-repeat;
            mask-size: contain;
            mask-position: center;
        }
        .comment-status-badge.applied {
            color: #8a8a8a;
        }
        .comment-status-badge.worked {
            color: #8BC832;
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
        btn.className = 'btn btn-action ml-auto studentski-review-stars-btn';
        btn.innerHTML = '<span class="extension-review-stars-badge" aria-hidden="true"><span class="extension-review-stars-logo"></span><span class="extension-review-stars-text"><span class="stars-base">★★★★★</span><span class="stars-fill">★★★★★</span></span></span>';
        btn.style.fontSize = '16px';

        const jobData = extractJobData(jobInfoContainer || dBlockContainer);
        updateButtonAverageStars(btn, jobData);

        btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
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
    /*console.log('Loading template from', url);*/

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
        /*console.log('Could not extract all styles, using defaults');*/
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
    if (!container) {
        return {
            get: () => 0,
            set: () => {}
        };
    }

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
    return {
        get: () => selected,
        set: (value) => {
            const parsed = Number(value);
            selected = Number.isFinite(parsed) ? Math.max(0, Math.min(5, Math.round(parsed))) : 0;
            update();
        }
    };
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
        /*console.log('Sending review payload to backend (inline form):', payload);*/
        chrome.runtime.sendMessage({ type: 'postReviewData', reviewData: payload }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            resolve(response || { success: false, error: 'No response from background' });
        });
    });
}

function wireInlineAddReview(modalOverlay, jobData, existingReview = null) {
    const titleInput = modalOverlay.querySelector('#inline-job-title-input');
    const companyInput = modalOverlay.querySelector('#inline-company-input');
    const locationInput = modalOverlay.querySelector('#inline-location-input');
    const commentInput = modalOverlay.querySelector('#inline-review-comment');

    const resolvedTitle = (
        existingReview?.title
        || existingReview?.position
        || existingReview?.jobTitle
        || jobData.title
        || ''
    );
    const resolvedCompany = (
        existingReview?.company
        || jobData.company
        || ''
    );
    const resolvedLocation = (
        existingReview?.location
        || jobData.location
        || ''
    );

    if (titleInput) titleInput.value = String(resolvedTitle).trim();
    if (companyInput) companyInput.value = String(resolvedCompany).trim();
    if (locationInput) locationInput.value = String(resolvedLocation).trim();

    if (titleInput) titleInput.readOnly = true;
    if (companyInput) companyInput.readOnly = true;
    if (locationInput) locationInput.readOnly = true;

    const overallStars = setupInlineStars(modalOverlay, '[data-target="inline-overall"]');
    const sub1Stars = setupInlineStars(modalOverlay, '[data-target="inline-sub1"]');
    const sub2Stars = setupInlineStars(modalOverlay, '[data-target="inline-sub2"]');
    const sub3Stars = setupInlineStars(modalOverlay, '[data-target="inline-sub3"]');
    const sub4Stars = setupInlineStars(modalOverlay, '[data-target="inline-sub4"]');

    if (existingReview) {
        const pickValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

        overallStars.set(pickValue(
            existingReview?.rating,
            existingReview?.overall_rating,
            existingReview?.overall
        ));
        sub1Stars.set(pickValue(
            existingReview?.work_environment,
            existingReview?.sub1,
            existingReview?.workEnvironment
        ));
        sub2Stars.set(pickValue(
            existingReview?.location_rating,
            existingReview?.sub2,
            existingReview?.location,
            existingReview?.locationRating
        ));
        sub3Stars.set(pickValue(
            existingReview?.communication,
            existingReview?.sub3
        ));
        sub4Stars.set(pickValue(
            existingReview?.flexibility,
            existingReview?.sub4
        ));

        if (commentInput) {
            commentInput.value = existingReview?.comment || '';
        }
    } else if (commentInput) {
        commentInput.value = '';
    }

    const saveBtn = modalOverlay.querySelector('.inline-save-review-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async (event) => {
        event.preventDefault();

        const reviewData = {
            company: companyInput?.value.trim() || '',
            jobTitle: titleInput?.value.trim() || '',
            location: locationInput?.value.trim() || '',
            overall: overallStars.get(),
            sub1: sub1Stars.get(),
            sub2: sub2Stars.get(),
            sub3: sub3Stars.get(),
            sub4: sub4Stars.get(),
            comment: commentInput?.value.trim() || '',
            anonymous: false,
            user: getCurrentUserIdentity().email
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
        } else {
            invalidateListingReviewCache(reviewData);
            refreshStudentskiListingStars({ forceRefresh: true });
            updateReviewDisclosureLabel(modalOverlay, true);
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

        fetchListingReviewSummary({ ...jobData, forceRefresh: true }, { forceRefresh: true })
            .then((summary) => {
                renderPopupAverageData(modalOverlay, summary);
                renderPopupComments(modalOverlay, summary);
                updateReviewDisclosureLabel(modalOverlay, hasCurrentUserReviewed(summary, jobData));
                wireInlineAddReview(modalOverlay, jobData, getCurrentUserReview(summary, jobData));
            })
            .catch((error) => {
                console.warn('Failed to load popup averages', error);
                renderPopupAverageData(modalOverlay, null);
                renderPopupComments(modalOverlay, null);
                updateReviewDisclosureLabel(modalOverlay, hasCurrentUserReviewed(null, jobData));
                wireInlineAddReview(modalOverlay, jobData, null);
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

window.addEventListener('despicable-jobs-scraped', () => {
    refreshStudentskiListingStars({ forceRefresh: false });
});