const usernameInput        = document.getElementById("username");
const saveButton           = document.getElementById("save-btn");
const popupCheckbox        = document.getElementById("cb-popup");
const notificationCheckbox = document.getElementById("cb-notification");
const themeSelection       = document.getElementById("theme-selection");
const saveMsg              = document.getElementById("save-msg");

usernameInput.addEventListener("input", () => {
    usernameInput.setCustomValidity('');
    usernameInput.checkValidity();
});
usernameInput.addEventListener("invalid", () => {
    if (usernameInput.validity.valueMissing) {
        usernameInput.setCustomValidity("The username is required.");
    } else if (usernameInput.validity.tooShort || usernameInput.validity.tooLong) {
        usernameInput.setCustomValidity("Usernames must be between 3 and 25 characters.");
    } else {
        usernameInput.setCustomValidity('');
    }
});

async function GETRequest(URL) {
    try {
        const response = await fetch (
            URL,
            {
                method: 'GET',
                headers: {
                    'Accept':    'application/vnd.twitchtv.v5+json',
                    'Client-ID': 'haeyonp05j4wiphav3eppivtdsvlyoq'
                }
            }
        );

        if (!response.ok) {
            saveMsg.innerHTML        = `Failed to reach server: status (${response.status})`;
            saveMsg.style.visibility = 'visible';
            saveMsg.style.color      = '#971311';
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

async function getUserID() {
    const username = usernameInput.value.trim();
    const URL      = `https://api.twitch.tv/kraken/users?login=${username}`;

    const response = await GETRequest(URL);

    if (!response) return "error:unreachable";
    else if (response["_total"] === 0) return null;
    return response["users"][0]["_id"];
}

saveButton.addEventListener("click", (e) => {
    const openInPopup       = popupCheckbox.checked;
    const showNotifications = notificationCheckbox.checked;
    const selectedTheme     = themeSelection.selectedIndex;

    const usernameValidity = usernameInput.validity;
    if (!(usernameValidity.valueMissing || usernameValidity.tooShort || usernameValidity.tooLong)) {
        (async () => {
            // making sure the username is valid
            const userID = await getUserID();

            if (userID === "error:unreachable" || !userID) {
                saveMsg.innerHTML               = "*Invalid username.";
                saveMsg.style.visibility        = 'visible';
                saveMsg.style.color             = '#971311';
                usernameInput.style.borderColor = "#971311";
            } else {
                const isFirstRun = new Promise((resolve, reject) => {
                    chrome.storage.local.get(['settings'], (storage) => {
                        if (storage.settings === undefined) resolve(true);
                        else reject();
                    });
                });

                const settings = {
                    "username":      usernameInput.value.trim(),
                    "userID":        userID,
                    "popup":         openInPopup,
                    "notifications": showNotifications,
                    "theme":         selectedTheme
                };
                chrome.storage.local.set({'settings': settings}, () => {
                    saveMsg.innerHTML               = "Settings saved";
                    saveMsg.style.visibility        = 'visible';
                    saveMsg.style.color             = '#5ece37';
                    usernameInput.style.borderColor = "rgba(1, 0, 0, 0.1)";
                    setTimeout(() => window.close(), 1000);
                });

                isFirstRun.then((response) => {
                    if (response) {
                        chrome.runtime.sendMessage({"message": "update"});
                    }
                }).catch((error) => console.error(error));
            }
        })();
        e.preventDefault();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['settings'], (storage) => {
        if (storage.settings !== undefined) {
            usernameInput.value          = storage.settings["username"];
            popupCheckbox.checked        = storage.settings["popup"];
            notificationCheckbox.checked = storage.settings["notifications"];
            themeSelection.selectedIndex = storage.settings["theme"];
        }
    });
});
