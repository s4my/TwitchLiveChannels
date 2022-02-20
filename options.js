// Copyright (C) 2022 s4my <samydevacnt@gmail.com>
// See end of file for extended copyright information.

const CLIENT_ID = "yhzcodpomkejkstupuqajj9leqg630";

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

function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['authentication'], (storage) => {
            if (storage.authentication === undefined || storage.authentication["access_token"] === "") {
                document.getElementById("loading").style.display = "block";
                chrome.identity.launchWebAuthFlow({
                    url: `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}`+
                         `&redirect_uri=${chrome.identity.getRedirectURL()}&response_type=token`+
                         `&scope=user:read:follows&force_verify=true`,
                    interactive: true
                }, (redirect_url) => {
                    if (chrome.runtime.lastError || redirect_url.includes("error")) {
                        console.error(`failed to get Access TOKEN (redirect_url: ${redirect_url}`);
                        document.getElementById("loading").style.display = "none";
                        reject();
                    } else {
                        const access_token = redirect_url.split("#").pop().split("&")[0].split("=")[1];
                        chrome.storage.local.set({'authentication': {"access_token": access_token}});
                        document.getElementById("loading").style.display = "none";
                        resolve(access_token);
                    }
                });
            } else {
                document.getElementById("loading").style.display = "none";
                resolve(storage.authentication["access_token"]);
            }
        });
    });
}

async function getUserID() {
    const usernameValidity = usernameInput.validity;
    if (usernameValidity.valueMissing || usernameValidity.tooShort || usernameValidity.tooLong) {
        return null;
    }

    const username = sanitize(usernameInput.value.trim());
    const URL      = `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`;

    try {
        const response = await fetch (
            URL,
            {
                method: 'GET',
                headers: {
                    'Client-ID':     CLIENT_ID,
                    'Authorization': `Bearer ${await getAuthToken()}`
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

        if (jsonResponse["data"].length === 0) {
            saveMsg.textContent             = "*Invalid username.";
            saveMsg.style.visibility        = 'visible';
            saveMsg.style.color             = '#e16666';
            usernameInput.style.borderColor = "#e16666";
            return null;
        }

        return jsonResponse["data"][0]["id"];
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

// TTV live extension helps you keep track of who is live out of the
// channels you follow on Twitch (https://www.twitch.tv/)
//
// Copyright (C) 2022 s4my <samydevacnt@gmail.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
