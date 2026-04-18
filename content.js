function injectButton() {
    console.log("BANANA");

    const dodajButtons = document.querySelectorAll('button[sifra-data]');

    dodajButtons.forEach(dodajBtn => {
        const container = dodajBtn.closest(".d-block");
        if (!container) return;

        // Prevent duplicates
        if (container.querySelector(".my-stars-div")) return;

        const wrapper = document.createElement("div");
        wrapper.className = "job-actions col-12 mb-1 ml-auto px-0 my-stars-div";

        const btn = document.createElement("button");
        btn.className = "btn btn-action ml-auto";
        btn.innerHTML = "★★★★★";
        btn.style.fontSize = "16px";

        btn.onclick = () => {
            alert("Stars clicked!");
        };

        wrapper.appendChild(btn);

        const allJobsDiv = container.querySelector("a[href*='vsadelapodj']")?.closest(".job-actions");

        if (allJobsDiv) {
            allJobsDiv.insertAdjacentElement("afterend", wrapper);
        } else {
            container.appendChild(wrapper);
        }
    });
}

injectButton();
setInterval(injectButton, 2000);