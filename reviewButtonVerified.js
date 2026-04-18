function injectVerifiedReviewButtons() {

    if (!window.location.href.includes("/studenti/moje-izkusnje/")) {
    return;
    }

    console.log("BANANA (review)");

    const jobRows = document.querySelectorAll(".row.border-bottom");

    jobRows.forEach(row => {
        const titleDiv = row.querySelector(".col-12.h3");
        if (!titleDiv) return;

        // Prevent duplicates
        if (titleDiv.querySelector(".my-review-btn")) return;

        // Wrap text in span (important!)
        const text = titleDiv.firstChild.textContent.trim();
        titleDiv.innerHTML = ""; // clear

        const textSpan = document.createElement("span");
        textSpan.innerText = text;

        // Create button
        const btn = document.createElement("button");
        btn.className = "btn btn-action my-review-btn";

        const key = "review_" + text;
        const savedRaw = localStorage.getItem(key);
        const saved = savedRaw ? JSON.parse(savedRaw) : null;

        if (saved) {
            btn.innerHTML = "★★★★★".slice(0, saved.overall) + "☆☆☆☆☆".slice(saved.overall);
        } else {
            btn.innerText = "Add review";
        }

        // FLEX layout
        titleDiv.style.display = "flex";
        titleDiv.style.alignItems = "center";

        // 👉 THIS is the key line
        btn.style.marginLeft = "auto";

        btn.onclick = () => {
            event.preventDefault();
            event.stopPropagation();
            showAddReviewModal(text, (data) => {
                localStorage.setItem(key, JSON.stringify(data));
                btn.innerHTML = "★★★★★".slice(0, data.overall) + "☆☆☆☆☆".slice(data.overall);
            });
        };

        titleDiv.appendChild(textSpan);
        titleDiv.appendChild(btn);
    });
}

injectVerifiedReviewButtons();
setInterval(injectVerifiedReviewButtons, 2000);

function injectRatingsTable() {

    if (!window.location.href.includes("/studenti/izdane-napotnice/")) {
        return;
    }

    console.log("BANANA (table ratings)");

    const table = document.querySelector("table");
    if (!table) return;

    const theadRow = table.querySelector("thead tr");
    const tbodyRows = table.querySelectorAll("tbody tr");

    // ✅ Insert header at correct position
    if (!theadRow.querySelector(".my-ocena-header")) {
        const th = document.createElement("th");
        th.innerText = "Ocene";
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

            const stars =
                "★★★★★".slice(0, saved.overall)
                + "☆☆☆☆☆".slice(saved.overall);    
            btn.innerText = stars;

            btn.onclick = () => {
                event.preventDefault();
                event.stopPropagation();
                showAddReviewModal(company, (data) => {
                    localStorage.setItem(key, JSON.stringify(data));

                    btn.innerText =
                        "★★★★★".slice(0, data.overall)
                        + "☆☆☆☆☆".slice(data.overall);
                });
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

    if (!window.location.href.includes("/studenti/moje-prijave-na-dela")) {
        return;
    }

    console.log("BANANA (prijave review)");

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

        btn.innerText = saved
            ? "★★★★★".slice(0, saved.overall) + "☆☆☆☆☆".slice(saved.overall)
            : "Review";

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            showAddReviewModal(company, (data) => {
                localStorage.setItem(key, JSON.stringify(data));

                btn.innerText =
                    "★★★★★".slice(0, data.overall) +
                    "☆☆☆☆☆".slice(data.overall);
            });
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

function showAddReviewModal(company, onSave) {

    // Remove existing modal if present
    const existingModal = document.getElementById('review-modal-overlay');
    if (existingModal) existingModal.remove();

    const websiteStyles = extractWebsiteStyles();

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
            'job-title-input': [
                'Software Developer',
                'Frontend Engineer',
                'Backend Engineer',
                'Full Stack Developer',
                'Data Analyst',
                'Project Manager',
                'Designer',
                'QA Engineer',
                'DevOps Engineer',
                'System Administrator'
            ],
            'company-input': [
                'Google',
                'Microsoft',
                'Apple',
                'Amazon',
                'Facebook',
                'Tesla',
                'Netflix',
                'Uber',
                'Airbnb',
                'LinkedIn'
            ],
            'location-input': [
                'Ljubljana',
                'Maribor',
                'Koper',
                'Celje',
                'Kranj',
                'Remote',
                'New York',
                'San Francisco',
                'London',
                'Berlin'
            ]
        };

        // Initialize autocomplete for each field
        Object.keys(autocompleteData).forEach(fieldId => {
            initializeAutocomplete(modalOverlay, fieldId, autocompleteData[fieldId]);
        });

        // -----------------------------
        // ⭐ STAR LOGIC (FIXED)
        // -----------------------------
        function setupStars(selector) {
            const container = modalOverlay.querySelector(selector);
            if (!container) return () => 0;

            const stars = container.querySelectorAll("span");
            let selected = 0;

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
            saveBtn.onclick = () => {

                const data = {
                    company: getInputValue('company-input') || company,
                    jobTitle: getInputValue('job-title-input') || "",
                    location: getInputValue('location-input') || "",

                    overall: getOverall(),
                    sub1: getSub1(),
                    sub2: getSub2(),
                    sub3: getSub3(),
                    sub4: getSub4(),

                    comment: modalOverlay.querySelector('#review-comment')?.value || ""
                };

                // REQUIRED FIELDS CHECK
                if (!data.company || !data.jobTitle || !data.location) {
                    alert("Fill in Job Title, Company and Location");
                    return;
                }

                onSave(data);

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