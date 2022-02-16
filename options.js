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

function sanitize(string) {
    const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', "/": '&#x2F;'};
    return string.replace(/[&<>"'/]/ig, (match)=>(map[match]));
}

async function getUserID() {
    const usernameValidity  = usernameInput.validity;
    if (usernameValidity.valueMissing || usernameValidity.tooShort || usernameValidity.tooLong) {
        return null;
    }

    const username = sanitize(usernameInput.value.trim());
    const URL      = `https://api.twitch.tv/kraken/users?login=${username}`;

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
            saveMsg.textContent      = `Error: failed to reach server (status code ${response.status})`;
            saveMsg.style.visibility = 'visible';
            saveMsg.style.color      = '#e16666';
            return null;
        }

        const jsonResponse = await response.json();

        if (jsonResponse["_total"] === undefined) {
            throw new Error("could not verify the unsername validity");
        } else if (jsonResponse["_total"] === 0) {
            saveMsg.textContent             = "*Invalid username.";
            saveMsg.style.visibility        = 'visible';
            saveMsg.style.color             = '#e16666';
            usernameInput.style.borderColor = "#e16666";
            return null;
        }

        return jsonResponse["users"][0]["_id"];
    } catch (error) {
        console.error(error);
        return null;
    }
}

function settingsSaved(settings) {
    chrome.storage.local.set({'settings': settings}, () => {
        saveMsg.textContent             = "Settings saved";
        saveMsg.style.visibility        = 'visible';
        saveMsg.style.color             = '#5ece37';
        usernameInput.style.borderColor = "rgba(1, 0, 0, 0.1)";
        setTimeout(() => window.close(), 1000);
    });
}

saveButton.addEventListener("click", (e) => {
    const openInPopup       = popupCheckbox.checked;
    const showNotifications = notificationCheckbox.checked;
    const selectedTheme     = themeSelection.selectedIndex;

    chrome.storage.local.get(['settings'], (storage) => {
        (async () => {
            if (storage.settings !== undefined) {
                if (usernameInput.value.trim() === storage.settings['username']) {
                    const settings = {
                        "username":      storage.settings['username'],
                        "userID":        storage.settings['userID'],
                        "popup":         openInPopup,
                        "notifications": showNotifications,
                        "theme":         selectedTheme
                    };

                    settingsSaved(settings);
                    return;
                }
            }

            const userID = await getUserID();

            if (userID !== null) {
                const settings = {
                    "username":      usernameInput.value.trim(),
                    "userID":        userID,
                    "popup":         openInPopup,
                    "notifications": showNotifications,
                    "theme":         selectedTheme
                };

                settingsSaved(settings);
                chrome.runtime.sendMessage({"message": "update"});
            }
        })();
    });
    e.preventDefault();
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
