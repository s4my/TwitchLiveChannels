// Copyright (C) 2022 s4my <samydevacnt@gmail.com>
// See end of file for extended copyright information.

const CLIENT_ID = "yhzcodpomkejkstupuqajj9leqg630";

const form                 = document.getElementById("form");
const loginButton          = document.getElementById("login-btn");
const logoutButton         = document.getElementById("logout-btn");
const saveButton           = document.getElementById("save-btn");
const popupCheckbox        = document.getElementById("cb-popup");
const notificationCheckbox = document.getElementById("cb-notification");
const themeSelection       = document.getElementById("theme-selection");
const saveMsg              = document.getElementById("save-msg");

function updateBadge(counter) {
    chrome.browserAction.setBadgeBackgroundColor({color: "#6a75f2"});
    chrome.browserAction.setBadgeText({"text": counter});
}

function logIn() {
    document.getElementById("loading").style.display = "block";

    return new Promise((resolve, reject) => {
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
                chrome.storage.local.set({"authentication": {"access_token": access_token}});
                document.getElementById("loading").style.display = "none";
                resolve(access_token);
            }
        });
    });
}

function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["authentication"], (storage) => {
            if (!storage.authentication || !storage.authentication["access_token"]) {
                resolve(logIn());
            } else resolve(storage.authentication["access_token"]);
        });
    });
}

function validateToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["authentication"], (storage) => {
            if (storage.authentication !== undefined || storage.authentication["access_token"]) {
                fetch ("https://id.twitch.tv/oauth2/validate", {
                    headers: {'Authorization': `Bearer ${storage.authentication["access_token"]}`}
                }).then(response => {
                    if (!response.ok) {
                        throw `failed to verify access token validity (${response.status})`;
                    }
                    return response.json();
                }).then(response => {
                    if (response["expires_in"] === 0 && response["client_id"] !== client_id) {
                        chrome.storage.local.set({"loggedin": false});
                        updateBadge("0");
                        resolve(false);
                    } else {
                        resolve(true);
                        chrome.storage.local.set({"loggedin": true});
                    }
                }).catch(error => {
                    console.error(error);
                    chrome.storage.local.set({"loggedin": false});
                    updateBadge("0");
                    resolve(false);
                });
            }
        });
    });
}

async function getUserInfo() {
    const URL = "https://api.twitch.tv/helix/users";

    try {
        const response = await fetch (
            URL,
            {
                method: "GET",
                headers: {
                    "Client-ID":     CLIENT_ID,
                    "Authorization": `Bearer ${await getAuthToken()}`
                }
            }
        );

        if (response.status === 401) {
            loginButton.style.display  = "block";
            logoutButton.style.display = "none";
            saveButton.disabled        = true;

            const profilePicture = document.getElementById("profile-picture");
            profilePicture.style.background = "";
            profilePicture.style.filter     = "";

            saveMsg.textContent      = `Error: OAuth token is missing or expired`;
            saveMsg.style.visibility = "visible";
            saveMsg.style.color      = "#b33030";

            return null;
        }

        if (!response.ok) {
            saveMsg.textContent      = `Error: failed to reach server (status code ${response.status})`;
            saveMsg.style.visibility = "visible";
            saveMsg.style.color      = "#b33030";
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
        saveMsg.textContent      = "Settings saved";
        saveMsg.style.visibility = "visible";
        saveMsg.style.color      = "#5ece37";
        setTimeout(() => saveMsg.style.visibility = "hidden", 1000);
    });
}

saveButton.addEventListener("click", (e) => {
    const openInPopup       = popupCheckbox.checked;
    const showNotifications = notificationCheckbox.checked;
    const selectedTheme     = themeSelection.selectedIndex;

    // when saving the settings for the 1st time tell background.js to call updateLiveChannels()
    // other wise there's no need to fetch an update every time a setting is changed.
    chrome.storage.local.get(['settings'], async (storage) => {
        if (storage.settings !== undefined) {
            const settings = {
                "username":        storage.settings["username"],
                "userID":          storage.settings["userID"],
                "profile_picture": storage.settings["profile_picture"],
                "popup":           openInPopup,
                "notifications":   showNotifications,
                "theme":           selectedTheme
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
            "username":        userInfo.display_name,
            "userID":          userInfo.id,
            "profile_picture": userInfo.profile_image_url,
            "popup":           openInPopup,
            "notifications":   showNotifications,
            "theme":           selectedTheme
        };

        settingsSaved(settings);
        chrome.runtime.sendMessage({"message": "update"});
    });

    saveButton.disabled = true;
    e.preventDefault();
});

loginButton.addEventListener("click", async (e) => {
    await logIn().then(response => {
        loginButton.style.display  = "none";
        logoutButton.style.display = "block";
        saveButton.disabled        = false;

        const profilePicture = document.getElementById("profile-picture");
        profilePicture.style.filter = "none";

        chrome.storage.local.get(["settings"], async (storage) => {
            if (storage.settings !== undefined) {
                profilePicture.style.background =
                    `url(${storage.settings["profile_picture"].replace("300x300", "70x70")})`+
                    ` center no-repeat`;
            } else {
                const userInfo = await getUserInfo();
                if (!userInfo) return;
                profilePicture.style.background =
                    `url(${userInfo.profile_image_url.replace("300x300", "70x70")})`+
                    ` center no-repeat`;
            }
        });
        chrome.runtime.sendMessage({"message": "validate_token"});

        saveMsg.textContent      = "Save the changes";
        saveMsg.style.visibility = "visible";
        saveMsg.style.color      = "#e97e4f";

        saveButton.disabled = false;
        chrome.storage.local.set({"loggedin": true});
        userJustLoggedIn = true;
    }).catch(error => {
        saveMsg.textContent      = "ERROR: Failed to Log In";
        saveMsg.style.visibility = "visible";
        saveMsg.style.color      = "#b33030";
    });
});

logoutButton.addEventListener("click", async (e) => {
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
        saveMsg.textContent      = `ERROR: failed to log out ${response.status}`;
        saveMsg.style.visibility = "visible";
        saveMsg.style.color      = "#b33030";
        return;
    }

    loginButton.style.display  = "block";
    logoutButton.style.display = "none";
    saveButton.disabled        = true;
    chrome.storage.local.set({"loggedin": false});
    updateBadge("0");
    userJustLoggedIn = false;

    const profilePicture = document.getElementById("profile-picture");
    profilePicture.style.background = "";
    profilePicture.style.filter     = "";
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
    chrome.storage.local.get(["settings", "authentication"], async (storage) => {
        if (storage.settings !== undefined && storage.authentication !== undefined) {
            if (storage.settings["username"] && storage.authentication["access_token"]) {
                if (await validateToken()) {
                    loginButton.style.display  = "none";
                    logoutButton.style.display = "block";

                    const profilePicture = document.getElementById("profile-picture");
                    profilePicture.style.background =
                        `url(${storage.settings["profile_picture"].replace("300x300", "70x70")})`+
                        ` center no-repeat`;
                    profilePicture.style.filter = "none";

                    popupCheckbox.checked        = storage.settings["popup"];
                    notificationCheckbox.checked = storage.settings["notifications"];
                    themeSelection.selectedIndex = storage.settings["theme"];
                }
            }
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
