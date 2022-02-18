// Copyright (C) 2022 s4my <samydevacnt@gmail.com>
// See end of file for extended copyright information.

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    }
});

async function getUserID() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['settings'], (storage) => {
            if (storage.settings === undefined) reject();
            else resolve(storage.settings["userID"]);
        });
    });
};

async function getStreamType() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['settings'], (storage) => {
            if (storage.settings !== undefined && !storage.settings["reruns"]) resolve("live");
            resolve("all");
        });
    });
};

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

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function updateLiveChannels() {
    chrome.storage.local.set({"status": "updating"});
    try {
        // fetch list of all followed channels
        const URL = `https://api.twitch.tv/kraken/users/${encodeURIComponent(await getUserID())}/`+
                    `follows/channels?limit=100`;

        const followedChannels = await GETRequest(URL);
        if (!followedChannels) throw new Error("failed to fetch followed list.");

        // get the list of all live streams
        let liveChannels = [];
        let channel_ids  = [];

        for (const channel of followedChannels.follows) channel_ids.push(channel.channel._id);
        const liveURL = `https://api.twitch.tv/kraken/streams/?channel=`+channel_ids.join(",")+
                        `&limit=100&stream_type=${await getStreamType()}`;

        try {
            const response = await GETRequest(liveURL);
            if (!response) throw new Error("failed to fetch live channels.");

            for (stream of response.streams) {
                const display_name = stream.channel.display_name;
                const category     = (stream.channel.game === '') ? 'UNDEFINED':stream.channel.game;
                const viewers      = stream.viewers;
                const title        = stream.channel.status;
                const logo         = stream.channel.logo;

                const data = {
                    'name':     display_name,
                    'category': category,
                    'viewers':  viewers,
                    'title':    title,
                    'logo':     logo
                };

                liveChannels.push(data);
            }
        } catch (error) {
            console.error(error);
            return;
        }

        chrome.storage.local.set({'liveChannels': liveChannels});
        chrome.browserAction.getBadgeText({}, () => {
            updateBadge(liveChannels.length.toString());
        });

        console.log("Last time updated: "+new Date().toUTCString());

        // tell popup.js to update the UI
        chrome.runtime.sendMessage({"message": "updateUI"});
    } catch (error) {
        if (error !== undefined) console.error(error);
    }

    chrome.storage.local.set({"status": "done"});
}

function updateBadge(liveChannelCounter) {
    chrome.browserAction.setBadgeBackgroundColor({color: '#6a75f2'});
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
                         let canvas = document.createElement('canvas');
                         canvas.width  = 48;
                         canvas.height = 48;
                         let ctx = canvas.getContext('2d');

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
                             resolve(canvas.toDataURL('image/png'));
                         };
                     });
                 })
                 .catch(error => {
                     console.error(error);
                     return chrome.runtime.getURL("icons/icon-48.png");
                 });
    let notificationOptions = null;
    if (navigator.userAgent.indexOf("Chrome") > -1) {
        notificationOptions = {
            title:    'TTV live',
            priority: 0,
            type:     'list',
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
            title:    'TTV live',
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
                    chrome.storage.local.get(['settings'], (storage) => {
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

chrome.storage.local.get(['liveChannels'], (storage) => {
    if (storage.liveChannels === undefined || storage.liveChannels.length === 0) {
        chrome.browserAction.setBadgeBackgroundColor({color: "#6a75f2"});
        chrome.browserAction.setBadgeText({'text': '0'});
    }
});

// get list of all live channels every 2 min
updateLiveChannels();
setInterval(updateLiveChannels, 60*1000*2/*2 min*/);

// update when the updateBtn is clicked on the popup.html
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "update") {
        updateLiveChannels();
    }
});

chrome.storage.onChanged.addListener((storage, namespace) => {
    if(storage.liveChannels !== undefined) {
        // check for each channel if it's already in the storage,
        // if not, show notification and update the badge.
        for (const channelNew of storage.liveChannels.newValue) {
            const liveChannelCounter = storage.liveChannels.newValue.length;
            let notificationStatus   = true;

            if (storage.liveChannels.oldValue?.length > 0)
            {
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

            chrome.storage.local.get(['settings'], (storage) => {
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
// channels you follow on twitch.tv
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
