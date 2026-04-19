function extractJobData(jobContainer) {
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

        const hasLetters = (text) => /[A-Za-zÀ-ž]/.test(text || '');
        const isNotNumericOnly = (text) => !/^\d+$/.test((text || '').trim());
        const pickCandidate = (values) => values
            .map((text) => (text || '').trim())
            .find((text) => text && hasLetters(text) && isNotNumericOnly(text)) || '';

        const locationFromSvgNeighbor = pickCandidate(
            Array.from(card.querySelectorAll('div.flex.gap-2 svg + span')).map((span) => span.textContent)
        ) || pickCandidate(
            Array.from(card.querySelectorAll('svg + span')).map((span) => span.textContent)
        );

        if (locationFromSvgNeighbor) {
            jobData.location = locationFromSvgNeighbor;
        }

        if (!jobData.location) {
            const locationFromGap2Span = pickCandidate(
                Array.from(card.querySelectorAll('div.flex.gap-2 span')).map((span) => span.textContent)
            );
            if (locationFromGap2Span) {
                jobData.location = locationFromGap2Span;
            }
        }

        if (!jobData.location) {
            const locationRow = Array.from(card.querySelectorAll('div')).find(el =>
                el.classList.contains('flex') &&
                el.classList.contains('items-center') &&
                el.classList.contains('gap-4') &&
                el.classList.contains('text-[14px]')
            );
            if (locationRow) {
                const text = locationRow.textContent.trim();
                if (text) {
                    jobData.location = text;
                }
            }
        }

        if (!jobData.location) {
            const debugSvgNeighbor = Array.from(card.querySelectorAll('div.flex.gap-2 svg + span'))
                .map((span) => span.textContent.trim())
                .filter(Boolean);
            const debugGap2Spans = Array.from(card.querySelectorAll('div.flex.gap-2 span'))
                .map((span) => span.textContent.trim())
                .filter(Boolean);
            const debugGap4Rows = Array.from(card.querySelectorAll('div.flex.items-center.gap-4'))
                .map((row) => row.textContent.trim())
                .filter(Boolean);

            console.warn('mjob location extraction failed (empty location)', {
                extractedJobData: jobData,
                selectors: {
                    'div.flex.gap-2': card.querySelectorAll('div.flex.gap-2').length,
                    'div.flex.gap-2 svg + span': card.querySelectorAll('div.flex.gap-2 svg + span').length,
                    'div.flex.items-center.gap-4': card.querySelectorAll('div.flex.items-center.gap-4').length
                },
                svgNeighborTexts: debugSvgNeighbor,
                gap2SpanTexts: debugGap2Spans,
                gap4RowTexts: debugGap4Rows,
                cardClass: card.className,
                cardSnippet: (card.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220)
            });
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

function extractMjobLocationFromMetadataRow(row) {
    if (!row) return '';

    const fromSvgNeighbor = Array.from(row.querySelectorAll('svg + span'))
        .map((span) => (span.textContent || '').trim())
        .find(Boolean);
    if (fromSvgNeighbor) return fromSvgNeighbor;

    const fromGap2 = Array.from(row.querySelectorAll('div.flex.gap-2 span'))
        .map((span) => (span.textContent || '').trim())
        .filter(Boolean)
        .at(-1);
    if (fromGap2) return fromGap2;

    const rowText = (row.textContent || '').replace(/\s+/g, ' ').trim();
    return rowText || '';
}

const reviewAverageCache = new Map();
const reviewSummaryCache = new Map();
const reviewSummaryInFlight = new Map();
const FALLBACK_CURRENT_USER_EMAIL = 'timotejtbj@gmail.com';

function sendRuntimeMessageSafe(message) {
    return new Promise((resolve) => {
        const runtime = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome.runtime : null;

        if (!runtime?.id || typeof runtime.sendMessage !== 'function') {
            resolve({
                success: false,
                error: 'Extension context unavailable. Refresh the page and try again.'
            });
            return;
        }

        try {
            runtime.sendMessage(message, (response) => {
                if (runtime.lastError) {
                    const runtimeError = runtime.lastError.message || 'Runtime messaging failed';
                    if (/extension context invalidated/i.test(runtimeError)) {
                        resolve({
                            success: false,
                            error: 'Extension was reloaded. Refresh the page and try again.'
                        });
                        return;
                    }

                    resolve({ success: false, error: runtimeError });
                    return;
                }

                resolve(response || { success: false, error: 'No response from background' });
            });
        } catch (error) {
            const messageText = error?.message || String(error);
            if (/extension context invalidated/i.test(messageText)) {
                resolve({
                    success: false,
                    error: 'Extension was reloaded. Refresh the page and try again.'
                });
                return;
            }

            resolve({ success: false, error: messageText });
        }
    });
}

function toUpperTrim(value) {
    return (value || '').trim().toUpperCase();
}

function recoverMjobLocationFromDom(jobData) {
    if (!isMjobSite()) return '';

    const targetTitle = toUpperTrim(jobData?.title);
    const targetCompany = toUpperTrim(jobData?.company);
    if (!targetTitle || !targetCompany) return '';

    const cards = Array.from(document.querySelectorAll('a.job-card, .job-card'));

    for (const card of cards) {
        const titleElement = Array.from(card.querySelectorAll('h5')).find(el =>
            el.classList.contains('underline') && el.classList.contains('line-clamp-1')
        ) || card.querySelector('h5');
        const companyElement = Array.from(card.querySelectorAll('span')).find(el =>
            el.classList.contains('text-body-4-extra-light') && el.classList.contains('uppercase')
        ) || Array.from(card.querySelectorAll('span')).find(el => el.classList.contains('uppercase')) || card.querySelector('span');

        const cardTitle = toUpperTrim(titleElement?.textContent || '');
        const cardCompany = toUpperTrim(companyElement?.textContent || '');
        if (cardTitle !== targetTitle || cardCompany !== targetCompany) continue;

        const svgNeighborLocation = Array.from(card.querySelectorAll('div.flex.gap-2 svg + span'))
            .map((span) => (span.textContent || '').trim())
            .find(Boolean);
        if (svgNeighborLocation) return svgNeighborLocation;

        const gap2Location = Array.from(card.querySelectorAll('div.flex.gap-2 span'))
            .map((span) => (span.textContent || '').trim())
            .filter(Boolean)
            .at(-1);
        if (gap2Location) return gap2Location;
    }

    return '';
}

function buildReviewLookupParams(jobData) {
    return {
        company: jobData.company,
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
    let { params, cacheKey } = getListingCacheKey(jobData);

    if (isMjobSite() && !params.location) {
        const recoveredLocation = recoverMjobLocationFromDom(jobData);
        if (recoveredLocation) {
            jobData.location = recoveredLocation;
            ({ params, cacheKey } = getListingCacheKey(jobData));
        }
    }

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

    const pendingRequest = sendRuntimeMessageSafe({ type: 'getReviewData', params })
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

        if (toBooleanFlag(review?.edited)) {
            const editedMarker = document.createElement('span');
            editedMarker.className = 'comment-edited-marker';
            editedMarker.textContent = ' (edited)';
            date.appendChild(editedMarker);
        }

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

    const stylesheet = document.createElement('link');
    stylesheet.id = 'despicable-devs-star-logo-style';
    stylesheet.rel = 'stylesheet';
    stylesheet.href = chrome.runtime.getURL('injectedStarLogoStyles.css');
    document.head.appendChild(stylesheet);
}

function ensureMjobStarHoverStyles() {
    if (!isMjobSite() || document.getElementById('despicable-devs-mjob-star-style')) return;

    const stylesheet = document.createElement('link');
    stylesheet.id = 'despicable-devs-mjob-star-style';
    stylesheet.rel = 'stylesheet';
    stylesheet.href = chrome.runtime.getURL('mjobStarHoverStyles.css');
    document.head.appendChild(stylesheet);
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
                if (!jobData.location) {
                    const rowLocation = extractMjobLocationFromMetadataRow(row);
                    if (rowLocation) {
                        jobData.location = rowLocation;
                    }
                }
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
    }

    return {
        primaryColor,
        textColor,
        fontFamily,
        backgroundColor,
        borderColor
    };
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

    return sendRuntimeMessageSafe({ type: 'postReviewData', reviewData: payload });
}

async function editInlineReviewFromForm(reviewId, reviewData) {
    const payload = {
        company: reviewData.company,
        title: reviewData.jobTitle,
        location: reviewData.location,
        overall_rating: reviewData.overall,
        work_environment: reviewData.sub1,
        location_rating: reviewData.sub2,
        communication: reviewData.sub3,
        flexibility: reviewData.sub4,
        comment: reviewData.comment
    };

    return sendRuntimeMessageSafe({ type: 'editReviewData', reviewId, reviewData: payload });
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

        const isEditMode = (saveBtn.textContent || '').trim().toLowerCase() === 'save changes';
        const existingReviewId = String(existingReview?.review_id || '').trim();

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

        if (!reviewData.overall) {
            alert('Please rate the overall rating');
            return;
        }

        const storageKey = 'inline_review_' + [reviewData.company, reviewData.jobTitle, reviewData.location].join('::');
        localStorage.setItem(storageKey, JSON.stringify(reviewData));
        console.log('Saved inline review:', reviewData);

        let actionResult = null;

        if (isEditMode) {
            if (!existingReviewId) {
                alert('Could not find the review id for editing. Please refresh and try again.');
                return;
            }
            actionResult = await editInlineReviewFromForm(existingReviewId, reviewData);
        } else {
            actionResult = await postInlineReviewFromForm(reviewData);
        }

        if (!actionResult?.success) {
            console.warn('Failed to submit inline review:', actionResult?.error || 'Unknown error');
            alert('Failed to save review. Please try again.');
            return;
        }

        if (!isEditMode) {
            try {
                const responseBody = actionResult?.body ? JSON.parse(actionResult.body) : null;
                const createdReviewId = String(responseBody?.review_id || '').trim();
                if (createdReviewId) {
                    localStorage.setItem(storageKey, JSON.stringify({
                        ...reviewData,
                        review_id: createdReviewId
                    }));
                }
            } catch (error) {
                // Keep saved local review without review_id if response parsing fails.
            }
        }

        invalidateListingReviewCache(reviewData);
        refreshStudentskiListingStars({ forceRefresh: true });

        modalOverlay.remove();
        const styleVars = document.getElementById('review-popup-css-vars');
        if (styleVars) {
            styleVars.remove();
        }
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