function ensureInjectedStarLogoStyles() {
    if (document.getElementById('despicable-devs-star-logo-style')) return;

    const style = document.createElement('style');
    style.id = 'despicable-devs-star-logo-style';
    style.textContent = `
        .extension-review-stars-logo {
            display: block;
            width: 12em;
            height: 2.3em;
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


function injectVerifiedReviewButtons() {
    ensureInjectedStarLogoStyles();

    if (!window.location.href.includes("/studenti/moje-izkusnje/")) {
    return;
    }


    const jobRows = document.querySelectorAll(".row.border-bottom");

    jobRows.forEach(row => {
        const companyDiv = row.querySelector(".col-12.h3");
        const titleDiv = Array.from(row.querySelectorAll("div.col-12"))
    .find(div => !div.classList.contains("h3") && !div.classList.contains("mb-0"));

    const jobTitle = titleDiv ? titleDiv.textContent.trim() : "";
        if (!companyDiv) return;
        if (!titleDiv) return;

        // Prevent duplicates
        if (companyDiv.querySelector(".my-review-btn")) return;
        if (titleDiv.querySelector(".my-review-btn")) return;

        // Wrap text in span (important!)
        const company = companyDiv.firstChild.textContent.trim();
        const location = "";

        const jobData = { title: jobTitle.toUpperCase(), company: company.toUpperCase(), location: location.toUpperCase() };

        companyDiv.innerHTML = ""; // clear

        console.log("Company:", company);
        console.log("Job Title:", jobTitle);

        const textSpan = document.createElement("span");
        textSpan.innerText = company;

        // Create button
        const btn = document.createElement("button");
        btn.className = "btn btn-action my-review-btn";
        btn.style.display = "flex";
        btn.style.flexDirection = "column";
        btn.style.alignItems = "center";
        btn.style.gap = "0.5rem";

        const logo = document.createElement("span");
        logo.className = "extension-review-stars-logo";
        logo.setAttribute("aria-hidden", "true");

        const content = document.createElement("div");

        const key = "review_" + company;
        const savedRaw = localStorage.getItem(key);
        const saved = savedRaw ? JSON.parse(savedRaw) : null;

        if (saved) {
            content.innerHTML = "★★★★★".slice(0, saved.overall) + "☆☆☆☆☆".slice(saved.overall);
            content.style.fontSize = "1.8em";
            content.style.lineHeight = "1";
        } else {
            content.innerText = "Add review";
        }

        btn.appendChild(logo);
        btn.appendChild(content);

        btn.onclick = () => {
            event.preventDefault();
            event.stopPropagation();
            showAddReviewModal(jobData, (data) => {
                localStorage.setItem(key, JSON.stringify(data));
                content.innerHTML = "★★★★★".slice(0, data.overall) + "☆☆☆☆☆".slice(data.overall);
                content.style.fontSize = "1.8em";
                content.style.lineHeight = "1";
            }, { didWork: true });
        };

        // FLEX layout for companyDiv
        companyDiv.style.display = "flex";
        companyDiv.style.alignItems = "center";
        btn.style.marginLeft = "auto";

        companyDiv.appendChild(textSpan);
        companyDiv.appendChild(btn);
    });
}

injectVerifiedReviewButtons();
setInterval(injectVerifiedReviewButtons, 2000);

function injectRatingsTable() {

    if (!window.location.href.includes("/studenti/izdane-napotnice/")) {
        return;
    }


    const table = document.querySelector("table");
    if (!table) return;

    const theadRow = table.querySelector("thead tr");
    const tbodyRows = table.querySelectorAll("tbody tr");

    // ✅ Insert header at correct position
    if (!theadRow.querySelector(".my-ocena-header")) {
        const th = document.createElement("th");
        ensureInjectedStarLogoStyles();
        th.innerHTML = '<span class="extension-review-stars-logo" aria-hidden="true"></span>';
        th.className = "bg-white text-center my-ocena-header";
        th.style.fontSize = "12px";

        // 👉 insert BEFORE "Veljavnost napotnice" (index 4)
        theadRow.insertBefore(th, theadRow.children[4]);
    }

    tbodyRows.forEach(row => {
        if (row.querySelector(".my-ocena-cell")) return;

        const companyCell = row.querySelector(".title");
        if (!companyCell) return;

        const company = companyCell.innerText.trim();
        const key = "review_" + company;
        const savedRaw = localStorage.getItem(key);
        const saved = savedRaw ? JSON.parse(savedRaw) : null;

        const td = document.createElement("td");
        td.className = "text-center my-ocena-cell";

        if (saved) {
            const btn = document.createElement("button");
            btn.className = "btn btn-action my-ocena-btn";
            btn.style.fontSize = "1.8em";
            btn.style.lineHeight = "1";

            const stars =
                "★★★★★".slice(0, saved.overall)
                + "☆☆☆☆☆".slice(saved.overall);    
            btn.innerText = stars;

            btn.onclick = () => {
                event.preventDefault();
                event.stopPropagation();
                showAddReviewModal(jobData, (data) => {
                    localStorage.setItem(key, JSON.stringify(data));

                    btn.innerText =
                        "★★★★★".slice(0, data.overall)
                        + "☆☆☆☆☆".slice(data.overall);
                }, { didWork: true });
            };

            td.appendChild(btn);
        }

        // 👉 insert at same position as header (index 4)
        row.insertBefore(td, row.children[4]);
    });
}

injectRatingsTable();
setInterval(injectRatingsTable, 2000);

function injectPrijaveReviewButtons() {
    ensureInjectedStarLogoStyles();

    if (!window.location.href.includes("/studenti/moje-prijave-na-dela")) {
        return;
    }


    const rows = document.querySelectorAll(".row.border-bottom");

    rows.forEach(row => {

        // 👉 NEW TARGET: ODPRI button container
        const openBtnContainer = row.querySelector(".col-12.text-md-right.d-none.d-md-flex");
        if (!openBtnContainer) return;

        if (row.querySelector(".my-prijave-review-btn")) return;

        const title = row.querySelector(".h3, .h5");
        if (!title) return;

        const company = title.innerText.trim();
        const key = "review_" + company;

        const savedRaw = localStorage.getItem(key);
        const saved = savedRaw ? JSON.parse(savedRaw) : null;

        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-action my-prijave-review-btn";
        btn.type = "button";
        btn.style.display = "flex";
        btn.style.flexDirection = "column";
        btn.style.alignItems = "center";
        btn.style.gap = "0.5rem";

        const logo = document.createElement("span");
        logo.className = "extension-review-stars-logo";
        logo.setAttribute("aria-hidden", "true");

        const content = document.createElement("div");

        if (saved) {
            content.innerHTML = "★★★★★".slice(0, saved.overall) + "☆☆☆☆☆".slice(saved.overall);
            content.style.fontSize = "1.8em";
            content.style.lineHeight = "1";
        } else {
            content.innerText = "Add review";
        }

        btn.appendChild(logo);
        btn.appendChild(content);

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            showAddReviewModal(jobData, (data) => {
                localStorage.setItem(key, JSON.stringify(data));
                content.innerHTML = "★★★★★".slice(0, data.overall) + "☆☆☆☆☆".slice(data.overall);
                content.style.fontSize = "1.8em";
                content.style.lineHeight = "1";
            }, { didApply: true });
        };

        // 🔥 wrapper (forces new line under ODPRI)
        const wrapper = document.createElement("div");
        wrapper.className = "my-review-wrapper";

        // IMPORTANT: force full width so it drops below
        wrapper.style.width = "100%";
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "flex-end";
        wrapper.style.marginTop = "6px";

        wrapper.appendChild(btn);

        // insert AFTER ODPRI button (not inside same flex row behavior)
        openBtnContainer.insertAdjacentElement("afterend", wrapper);
    });
}

injectPrijaveReviewButtons();
setInterval(injectPrijaveReviewButtons, 2000);

async function postVerifiedReviewFromForm(reviewData) {
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
        console.log('Sending review payload to backend (verified modal):', payload);
        chrome.runtime.sendMessage({ type: 'postReviewData', reviewData: payload }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            resolve(response || { success: false, error: 'No response from background' });
        });
    });
}

function showAddReviewModal(jobData, onSave, context = {}) {

    // Remove existing modal if present
    const existingModal = document.getElementById('review-modal-overlay');
    if (existingModal) existingModal.remove();

    console.log("Opening review modal for company:", jobData.company, "with context:", context);

    const websiteStyles = extractWebsiteStyles();
    const savedRaw = localStorage.getItem("review_" + jobData.company);
    const savedReview = savedRaw ? JSON.parse(savedRaw) : null;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'review-modal-overlay';
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

    getPopupTemplate('addReviewPopup.html').then(template => {

        modalOverlay.innerHTML = template;

        // Autocomplete data
        const autocompleteData = {
            'job-title-input': [],
            'company-input': [],
            'location-input': []
        };

        const jobInput = modalOverlay.querySelector('#job-title-input');
        if (jobInput && jobData.title) {
            jobInput.value = jobData.title;
        }

        const companyInput = modalOverlay.querySelector('#company-input');
        if (companyInput && jobData.company) {
            companyInput.value = jobData.company;
        }

        const locationInput = modalOverlay.querySelector('#location-input');
        if (locationInput && jobData.location) {
            locationInput.value = jobData.location;
        }

        console.log("Extracted job data for modal:", jobData);
        console.log(jobInput, companyInput, locationInput);

        // Initialize autocomplete for each field
        Object.keys(autocompleteData).forEach(fieldId => {
            initializeAutocomplete(modalOverlay, fieldId, autocompleteData[fieldId]);
        });

        // -----------------------------
        // ⭐ STAR LOGIC (FIXED)
        // -----------------------------
        function setupStars(selector) {
            const container = modalOverlay.querySelector(selector);
            if (!container) return () => 5;

            const stars = container.querySelectorAll("span");
            let selected = 5;

            const update = () => {
                stars.forEach(s => {
                    const val = parseInt(s.dataset.value);
                    s.classList.toggle("active", val <= selected);
                });
            };

            stars.forEach(s => {
                s.addEventListener("click", () => {
                    selected = parseInt(s.dataset.value);
                    update();
                });
            });

            update();
            return () => selected;
        }

        const getOverall = setupStars('[data-target="overall"]');
        const getSub1 = setupStars('[data-target="sub1"]');
        const getSub2 = setupStars('[data-target="sub2"]');
        const getSub3 = setupStars('[data-target="sub3"]');
        const getSub4 = setupStars('[data-target="sub4"]');

        // -----------------------------
        // ❌ CLOSE BUTTON (FIXED)
        // -----------------------------
        const closeBtn = modalOverlay.querySelector('#review-modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modalOverlay.remove();
                styleVars.remove();
            };
        }

        // click outside closes
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
                styleVars.remove();
            }
        };

        // ESC closes
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.remove();
                styleVars.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Helper function to get values from input fields
        function getInputValue(elementId) {
            const input = modalOverlay.querySelector('#' + elementId);
            return input ? input.value.trim() : "";
        }

        // -----------------------------
        // 💾 SAVE BUTTON (FIXED)
        // -----------------------------
        const saveBtn = modalOverlay.querySelector('#save-review');

        if (saveBtn) {
            saveBtn.onclick = async () => {

                const data = {
                    company: getInputValue('company-input') || company,
                    jobTitle: getInputValue('job-title-input') || "",
                    location: getInputValue('location-input') || "",

                    overall: getOverall(),
                    sub1: getSub1(),
                    sub2: getSub2(),
                    sub3: getSub3(),
                    sub4: getSub4(),

                    comment: modalOverlay.querySelector('#review-comment')?.value || "",
                    anonymous: modalOverlay.querySelector('#anonymous-review')?.checked || false,
                    didApply: context.didApply === true,
                    didWork: context.didWork === true
                };

                // REQUIRED FIELDS CHECK
                if (!data.company || !data.jobTitle || !data.location) {
                    alert("Fill in Job Title, Company and Location");
                    return;
                }

                onSave(data);

                const postResult = await postVerifiedReviewFromForm(data);
                if (!postResult?.success) {
                    console.warn('Failed to post review:', postResult?.error || 'Unknown error');
                }

                modalOverlay.remove();
                styleVars.remove();
            };
        }

    }).catch(error => {
        console.error('Could not load review template', error);
    });
}

// ============================================================
// 🎯 INITIALIZE AUTOCOMPLETE
// ============================================================
function initializeAutocomplete(container, fieldId, options) {
    const input = container.querySelector('#' + fieldId);
    const dropdown = container.querySelector('#' + fieldId.replace('input', 'dropdown'));

    if (!input || !dropdown) return;

    // Filter and display options
    function filterAndDisplay(searchTerm) {
        const filtered = options.filter(opt => 
            opt.toLowerCase().includes(searchTerm.toLowerCase())
        );

        dropdown.innerHTML = '';
        
        if (searchTerm === '' || filtered.length === 0) {
            // Show all options if input is empty, or no results message
            const optionsToShow = searchTerm === '' ? options : [];
            
            if (optionsToShow.length === 0 && searchTerm !== '') {
                dropdown.innerHTML = '<div style="padding: 0.6rem 0.75rem; color: #999;">No matches found</div>';
            } else {
                optionsToShow.forEach(opt => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-option';
                    div.textContent = opt;
                    div.onclick = (e) => {
                        e.stopPropagation();
                        input.value = opt;
                        dropdown.classList.remove('active');
                    };
                    dropdown.appendChild(div);
                });
            }
        } else {
            filtered.forEach(opt => {
                const div = document.createElement('div');
                div.className = 'autocomplete-option';
                div.textContent = opt;
                div.onclick = (e) => {
                    e.stopPropagation();
                    input.value = opt;
                    dropdown.classList.remove('active');
                };
                dropdown.appendChild(div);
            });
        }

        if (dropdown.children.length > 0) {
            dropdown.classList.add('active');
        }
    }

    // Focus: show all options
    input.addEventListener('focus', () => {
        filterAndDisplay('');
    });

    // Input: filter options
    input.addEventListener('input', (e) => {
        filterAndDisplay(e.target.value);
    });

    // Click outside: hide dropdown
    document.addEventListener('click', (e) => {
        if (e.target !== input && !input.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}