// Copyright (C) 2022 s4my <samydevacnt@gmail.com>
// See end of file for extended copyright information.

const CLIENT_ID = "yhzcodpomkejkstupuqajj9leqg630";

const form = document.getElementById("form");
const loginButton = document.getElementById("login-btn");
const logoutButton = document.getElementById("logout-btn");
const saveButton = document.getElementById("save-btn");
const popupCheckbox = document.getElementById("cb-popup");
const notificationCheckbox = document.getElementById("cb-notification");
const themeSelection = document.getElementById("theme-selection");
const theme = document.getElementById("theme");
const profilePicture = document.getElementById("profile-picture");
const saveMsg = document.getElementById("save-msg");

let userJustLoggedIn = false;

loginButton.textContent = chrome.i18n.getMessage("settings_login_btn");
logoutButton.textContent = chrome.i18n.getMessage("settings_logout_btn");
saveButton.textContent = chrome.i18n.getMessage("settings_save_btn");
popupCheckbox.parentElement.lastChild.textContent = chrome.i18n.getMessage("settings_popup_option");
notificationCheckbox.parentElement.lastChild.textContent = chrome.i18n.getMessage("settings_notifications");
theme.firstChild.textContent = chrome.i18n.getMessage("settings_theme");
themeSelection.children[0].textContent = chrome.i18n.getMessage("settings_auto_theme");
themeSelection.children[1].textContent = chrome.i18n.getMessage("settings_light_theme");
themeSelection.children[2].textContent = chrome.i18n.getMessage("settings_dark_theme");

function updateBadge(counter) {
    chrome.browserAction.setBadgeBackgroundColor({color: "#6a75f2"});
    chrome.browserAction.setBadgeText({"text": counter});
}

function logIn() {
    const loadingDiv = document.getElementById("loading");
    loadingDiv.style.display = "block";

    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
            url: `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}`+
                 `&redirect_uri=${chrome.identity.getRedirectURL()}&response_type=token`+
                 "&scope=user:read:follows&force_verify=true",
            interactive: true
        }, (redirect_url) => {
            if (chrome.runtime.lastError || redirect_url.includes("error")) {
                console.error(`failed to get Access Token (redirect_url: ${redirect_url}`);
                loadingDiv.style.display = "none";
                reject();
            } else {
                const access_token = redirect_url.split("#").pop().split("&")[0].split("=")[1];
                chrome.storage.local.set({"access_token": access_token});
                loadingDiv.style.display = "none";
                resolve(access_token);
            }
        });
    });
}

function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["access_token"], (storage) => {
            if (storage.access_token === undefined || !storage.access_token) {
                resolve(logIn());
            } else resolve(storage.access_token);
        });
    });
}

function validateToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["access_token"], (storage) => {
            if (storage.access_token !== undefined || storage.access_token) {
                fetch ("https://id.twitch.tv/oauth2/validate", {
                    headers: {"Authorization": `Bearer ${storage.access_token}`}
                }).then(response => {
                    if (!response.ok) {
                        throw new Error(`failed to verify access token validity (${response.status})`);
                    }
                    return response.json();
                }).then(response => {
                    if (response["expires_in"] === 0 && response["client_id"] !== CLIENT_ID) {
                        chrome.storage.local.set({"loggedin": false});
                        updateBadge("0");
                        resolve(false);
                    } else {
                        resolve(true);
                        chrome.storage.local.set({"loggedin": true});
                    }
                }).catch(error => {
                    chrome.storage.local.set({"loggedin": false});
                    updateBadge("0");
                    reject(error);
                });
            }
        });
    });
}

async function getUserInfo() {
    try {
        const response = await fetch (
            "https://api.twitch.tv/helix/users",
            {
                method: "GET",
                headers: {
                    "Client-ID": CLIENT_ID,
                    "Authorization": `Bearer ${await getAuthToken()}`
                }
            }
        );

        if (response.status === 401) {
            loginButton.style.display = "block";
            logoutButton.style.display = "none";
            saveButton.disabled = true;

            document.getElementById("profile-picture").style.background = "";

            saveMsg.textContent = chrome.i18n.getMessage("settings_error_01");
            saveMsg.style.visibility = "visible";
            saveMsg.style.color = "#b33030";

            return null;
        }

        if (!response.ok) {
            saveMsg.textContent = `${chrome.i18n.getMessage("settings_error_02")} (status code:${response.status})`;
            saveMsg.style.visibility = "visible";
            saveMsg.style.color = "#b33030";
            return null;
        }

        const jsonResponse = await response.json();

        if (jsonResponse["data"].length === 0) return null;

        return jsonResponse["data"][0];
    } catch (error) {
        console.error(error);
        return null;
    }
}

function settingsSaved(settings) {
    chrome.storage.local.set({"settings": settings}, () => {
        saveMsg.textContent = chrome.i18n.getMessage("settings_saved");
        saveMsg.style.visibility = "visible";
        saveMsg.style.color = "#5ece37";
        setTimeout(() => saveMsg.style.visibility = "hidden", 1000);
    });
}

saveButton.addEventListener("click", (e) => {
    const openInPopup = popupCheckbox.checked;
    const showNotifications = notificationCheckbox.checked;
    const selectedTheme = themeSelection.selectedIndex;

    // when saving the settings, if the user just logged in, tell background.js to call
    // updateLiveChannels(), otherwise there's no need to fetch an update every time
    // a setting is changed.
    chrome.storage.local.get(["settings"], async (storage) => {
        if (storage.settings !== undefined) {
            const settings = {
                "username": storage.settings["username"],
                "userID": storage.settings["userID"],
                "profile_picture": storage.settings["profile_picture"],
                "popup": openInPopup,
                "notifications": showNotifications,
                "theme": selectedTheme
            };

            settingsSaved(settings);
            if (userJustLoggedIn) {
                chrome.runtime.sendMessage({"message": "update"});
                userJustLoggedIn = false;
            }
            return;
        }

        const userInfo = await getUserInfo();
        if (!userInfo) return;

        const settings = {
            "username": userInfo.display_name,
            "userID": userInfo.id,
            "profile_picture": userInfo.profile_image_url,
            "popup": openInPopup,
            "notifications": showNotifications,
            "theme": selectedTheme
        };

        settingsSaved(settings);
        chrome.runtime.sendMessage({"message": "update"});
    });

    saveButton.disabled = true;
    e.preventDefault();
});

loginButton.addEventListener("click", async () => {
    await logIn().then(response => {
        loginButton.style.display = "none";
        logoutButton.style.display = "block";
        saveButton.disabled = false;

        chrome.storage.local.get(["settings"], async (storage) => {
            if (storage.settings !== undefined) {
                profilePicture.style.background =
                    `url(${storage.settings["profile_picture"].replace("300x300", "70x70")})`+
                    " center no-repeat";
            } else {
                const userInfo = await getUserInfo();
                if (!userInfo) return;
                profilePicture.style.background =
                    `url(${userInfo.profile_image_url.replace("300x300", "70x70")})`+
                    " center no-repeat";
            }
        });
        chrome.runtime.sendMessage({"message": "validate_token"});

        saveMsg.textContent = chrome.i18n.getMessage("settings_save_changes");
        saveMsg.style.visibility = "visible";
        saveMsg.style.color = "#e97e4f";

        saveButton.disabled = false;
        chrome.storage.local.set({"loggedin": true});
        userJustLoggedIn = true;
    }).catch(error => {
        saveMsg.textContent = chrome.i18n.getMessage("settings_error_03");
        saveMsg.style.visibility = "visible";
        saveMsg.style.color = "#b33030";
        console.error(error);
    });
});

logoutButton.addEventListener("click", async () => {
    let formData = new FormData();
    formData.append("client_id", CLIENT_ID);
    formData.append("token", await getAuthToken());

    const response = await fetch (
        "https://id.twitch.tv/oauth2/revoke",
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        saveMsg.textContent = `${chrome.i18n.getMessage("settings_error_04")} (status code:${response.status})`;
        saveMsg.style.visibility = "visible";
        saveMsg.style.color = "#b33030";
        return;
    }

    loginButton.style.display = "block";
    logoutButton.style.display = "none";
    saveButton.disabled = true;
    chrome.storage.local.set({"loggedin": false});
    updateBadge("0");
    userJustLoggedIn = false;

    document.getElementById("profile-picture").style.background = "";
});

form.addEventListener("change", () => {
    chrome.storage.local.get(["settings"], (storage) => {
        if (storage.settings !== undefined) {
            if (popupCheckbox.checked !== storage.settings["popup"] ||
                notificationCheckbox.checked !== storage.settings["notifications"] ||
                themeSelection.selectedIndex !== storage.settings["theme"]) {
                saveButton.disabled = false;
            } else saveButton.disabled = true;
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(["settings", "access_token"], async (storage) => {
        if (storage.settings !== undefined && storage.access_token !== undefined) {
            if (storage.settings["username"] && storage.access_token) {
                loginButton.style.display = "none";
                logoutButton.style.display = "block";

                profilePicture.style.background =
                    `url(${storage.settings["profile_picture"].replace("300x300", "70x70")})`+
                    " center no-repeat";

                popupCheckbox.checked = storage.settings["popup"];
                notificationCheckbox.checked = storage.settings["notifications"];
                themeSelection.selectedIndex = storage.settings["theme"];

                try {
                    await validateToken();
                } catch (error) {
                    if (error) console.error(error);

                    loginButton.style.display = "block";
                    logoutButton.style.display = "none";
                    profilePicture.style.background = "";
                    popupCheckbox.checked = true;
                    notificationCheckbox.checked = true;
                    themeSelection.selectedIndex = 0;
                }
            }
        }
    });
});

// Twitch Live Channels helps you keep track of who is live out of the channels you follow
// on Twitch (https://www.twitch.tv/).
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
