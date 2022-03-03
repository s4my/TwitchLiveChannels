// Copyright (C) 2022 s4my <samydevacnt@gmail.com>
// See end of file for extended copyright information.

const CLIENT_ID = "yhzcodpomkejkstupuqajj9leqg630";

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL("options.html"));
        }
    }
});

function validateToken() {
    chrome.storage.local.get(["authentication"], (storage) => {
        if (storage.authentication !== undefined || storage.authentication["access_token"]) {
            fetch ("https://id.twitch.tv/oauth2/validate", {
                headers: {"Authorization": `Bearer ${storage.authentication["access_token"]}`}
            }).then(response => {
                if (!response.ok) {
                    throw "failed to verify Access Token validity (${response.status})";
                }
                return response.json();
            }).then(response => {
                if (response["expires_in"] === 0 && response["client_id"] !== CLIENT_ID) {
                    chrome.identity.launchWebAuthFlow({
                        url: `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}`+
                             `&redirect_uri=${chrome.identity.getRedirectURL()}&response_type=token`+
                             `&scope=user:read:follows&force_verify=true`,
                        interactive: true
                    }, (redirect_url) => {
                        if (chrome.runtime.lastError || redirect_url.includes("error")) {
                            throw "failed to get Access Token: ("+chrome.runtime.lastError.message+")";
                        } else {
                            const access_token = redirect_url.split("#").pop().split("&")[0].split("=")[1];
                            chrome.storage.local.set({"authentication": {"access_token": access_token}});
                            chrome.storage.local.set({"loggedin": true});
                        }
                    });
                }
            }).catch(error => {
                console.error(error);
                chrome.storage.local.set({"loggedin": false});
                updateBadge("0");
            });
        }
    });
}

function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["authentication"], (storage) => {
            if (storage.authentication !== undefined || storage.authentication["access_token"]) {
                resolve(storage.authentication["access_token"]);
            } else reject();
        });
    });
}

async function getUserID() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["settings"], (storage) => {
            if (!storage.settings) reject();
            else resolve(storage.settings["userID"]);
        });
    });
};

async function GETRequest(URL) {
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
            throw "OAuth token is missing or expired.";
            chrome.storage.local.set({"loggedin": false});
            updateBadge("0");
        }
        if (!response.ok) throw `HTTP error! status: ${response.status}`;
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function updateLiveChannels() {
    chrome.storage.local.set({"status": "updating"});
    try {
        // get the list of all live streams
        let liveChannels = [];
        const URL = `https://api.twitch.tv/helix/streams/followed?user_id=${await getUserID()}`;

        const response = await GETRequest(URL);
        if (!response) throw "failed to fetch live channels.";

        console.log(response);

        let user_ids = [];
        for (const stream of response.data) {
            const user_id   = stream.user_id;
            const user_name = stream.user_name;
            const category  = (stream.game_name === '') ? 'UNDEFINED':stream.game_name;
            const viewers   = stream.viewer_count;
            const title     = stream.title;

            if (!user_id || !user_name || !category || !viewers || !title) continue;

            user_ids.push(stream.user_id);

            const data = {
                "id":       user_id,
                "name":     user_name,
                "category": category,
                "viewers":  viewers,
                "title":    title,
                // fall back profile picture
                "logo":     "https://static-cdn.jtvnw.net/user-default-pictures-uv/" +
                            "cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png"
            };

            liveChannels.push(data);
        }

        // get profile pictures
        const getProfilePics = await GETRequest(`https://api.twitch.tv/helix/users?id=${user_ids.join("&id=")}`);
        if (!getProfilePics) throw "failed to get profile pictures";

        for (const channel of liveChannels) {
            for (const user_info of getProfilePics.data) {
                if (channel.id === user_info["id"]) {
                    channel["logo"] = user_info["profile_image_url"];
                }
            }
        }

        chrome.storage.local.set({"liveChannels": liveChannels});
        updateBadge(liveChannels.length.toString());

        console.log("Last time updated: "+new Date().toUTCString());

        // tell popup.js to update the UI
        chrome.runtime.sendMessage({"message": "updateUI"});
    } catch (error) {
        console.error(error);
    }

    chrome.storage.local.set({"status": "done"});
}

function updateBadge(liveChannelCounter) {
    chrome.browserAction.setBadgeBackgroundColor({color: "#6a75f2"});
    chrome.browserAction.setBadgeText({"text": liveChannelCounter});
}

async function showNotification(channel) {
    let notificationID = null;
    const name         = channel.name;
    const category     = channel.category;

    const logo = await fetch(channel.logo.replace("300x300", "70x70"))
                 .then(response => response.blob())
                 .then(blob => {
                     return new Promise((resolve, reject) => {
                         let canvas = document.createElement("canvas");
                         canvas.width  = 48;
                         canvas.height = 48;
                         let ctx = canvas.getContext("2d");

                         const img = new Image();
                         img.src = URL.createObjectURL(blob);

                         img.onload = () => {
                             ctx.save();
                             ctx.beginPath();
                             ctx.arc((canvas.width/2), (canvas.width/2), (canvas.width/2), 0,
                                     Math.PI * 2, false);
                             ctx.clip();
                             ctx.drawImage(img, 0, 0, 48, 48);
                             ctx.restore();
                             resolve(canvas.toDataURL("image/png"));
                         };
                     });
                 })
                 .catch(error => {
                     console.error(error);
                     // fall back icon
                     return chrome.runtime.getURL("icons/icon-48.png");
                 });

    let notificationOptions = null;

    if (navigator.userAgent.indexOf("Chrome") > -1) {
        notificationOptions = {
            title:    "TTV live",
            priority: 0,
            type:     "list",
            message:  '',
            items:    [{
                title   : name,
                message : ` is Live streaming ${category}`
            }],
            iconUrl:  logo,
            buttons:  [{title : 'Open'}]
        };
    } else if (navigator.userAgent.indexOf("Firefox") > -1) {
        notificationOptions = {
            title:    "TTV live",
            priority: 0,
            type:     'basic',
            message:  `<b>${name}</b> is Live streaming ${category}`,
            iconUrl:  logo
        };
    }

    chrome.notifications.create("", notificationOptions, (ID) => notificationID = ID);

    if (navigator.userAgent.indexOf("Chrome") > -1) {
        chrome.notifications.onButtonClicked.addListener((ID, btnID) => {
            if (ID === notificationID) {
                if (btnID === 0) {
                    chrome.storage.local.get(["settings"], (storage) => {
                        if (storage.settings !== undefined) {
                            if (storage.settings["popup"]) {
                                const popupWidth  = 900;
                                const popupHeight = 650;
                                const left        = (screen.width/2) - (popupWidth/2);
                                const top         = (screen.height/2) - (popupHeight/2);

                                window.open("https://player.twitch.tv/?channel="+encodeURIComponent(name)+
                                            "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                                            "_about", "width="+popupWidth+",height="+popupHeight+",left="+left+",top="+top);
                            } else {
                                window.open("https://www.twitch.tv/"+encodeURIComponent(name), "_about");
                            }
                        }
                    });

                    chrome.notifications.clear(notificationID);
                }
            }
        });
    }
}

chrome.storage.local.get(["liveChannels"], (storage) => {
    if (!storage.liveChannels || storage.liveChannels.length === 0) {
        updateBadge("0");
    }
});

// get list of all live channels every 2 min
updateLiveChannels();
setInterval(updateLiveChannels, 60*1000*2);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "update") {
        // update when the updateBtn is clicked on the popup.html
        updateLiveChannels();
    } else if (request.message === "validate_token") {
        // validate access token every 60 min
        setInterval(validateToken, 60*1000*60);
    }
});

chrome.storage.onChanged.addListener((storage, namespace) => {
    if(storage.liveChannels !== undefined) {
        // check for each channel if it's already in the storage,
        // if not, show notification and update the badge.
        for (const channelNew of storage.liveChannels.newValue) {
            const liveChannelCounter = storage.liveChannels.newValue.length;
            let notificationStatus   = true;

            if (storage.liveChannels.oldValue?.length > 0) {
                for (const channelOld of storage.liveChannels.oldValue) {
                    if (channelNew.name === channelOld.name) {
                        notificationStatus = false;
                        break;
                    }
                }
            }

            chrome.browserAction.getBadgeText({}, (oldbadgetext) => {
                if (oldbadgetext !== liveChannelCounter) {
                    updateBadge(liveChannelCounter.toString());
                }
            });

            chrome.storage.local.get(["settings"], (storage) => {
                if (storage.settings !== undefined) {
                    if (storage.settings["notifications"] && notificationStatus) {
                        showNotification(channelNew);
                    }
                }
            });
        }
    }
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
