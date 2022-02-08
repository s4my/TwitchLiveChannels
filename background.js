// Copyright (C) 2022 s4my <samy.hacker@gmail.com>
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
    console.log("[~] Fetching update...");
    // fetch list of all followed channels
    try {
        const userID = await getUserID();
        const URL    = `https://api.twitch.tv/kraken/users/${userID}/follows/channels?limit=100&offset=0`;

        const followedChannels = await GETRequest(URL);
        if (!followedChannels) throw new Error("failed to fetch followed list.");

        let liveChannels = [];

        for (const channel of followedChannels.follows) {
            const id   = channel.channel._id;
            const name = channel.channel.name;

            // fetch live status for each followed channel
            try {
                const liveURL = 'https://api.twitch.tv/kraken/streams/'+id;
                const channelStatus = await GETRequest(liveURL);
                if (!channelStatus) throw new Error("failed to fetch live channels.");

                if (channelStatus.stream !== null) {
                    let stream_type = '';
                    if (channelStatus.stream.stream_type === 'playlist') {stream_type = 'VOD';}
                    else if (channelStatus.stream.stream_type === 'live') {stream_type = 'live';}

                    const display_name = channelStatus.stream.channel.display_name;
                    const category     = (channelStatus.stream.channel.game === '') ?
                                         'UNDEFINED':channelStatus.stream.channel.game;
                    const viewers      = channelStatus.stream.viewers;
                    const title        = channelStatus.stream.channel.status;
                    const logo         = channelStatus.stream.channel.logo;

                    const data = {
                        'name':     display_name,
                        'category': category,
                        'viewers':  viewers,
                        'title':    title,
                        'type':     stream_type,
                        'logo':     logo
                    };

                    liveChannels.push(data);
                }
            } catch (error) {
                console.error(error);
                return;
            }
        }

        chrome.storage.local.set({'liveChannels': liveChannels});
        chrome.browserAction.getBadgeText({}, () => {
            updateBadge(liveChannels.length.toString());
        });

        // tell popup.js to update the UI
        chrome.runtime.sendMessage({"message": "updateUI"});

        console.log(liveChannels);
        console.log("Update done: "+new Date().toUTCString());
    } catch (error) {
        if (error !== undefined) console.error(error);
    }
}

function updateBadge(liveChannelCounter) {
    chrome.browserAction.setBadgeBackgroundColor({color: '#6a75f2'});
    chrome.browserAction.setBadgeText({"text": liveChannelCounter});
}

async function showNotification(channel) {
    let notificationID = null;
    const name         = channel.name;
    const category     = channel.category;

    const logo = await fetch(channel.logo)
        .then(response => response.blob())
        .then(blob => URL.createObjectURL(blob))
        .catch(error => {
            console.error(error);
            return chrome.runtime.getURL("icons/icon-48.png");
        });

    const notificationOptions = {
        title:    'TTV live',
        priority: 0,
        type:     'list',
        message:  ``,
        items:    [{
            title   : name,
            message : ` is Live streaming ${category}`
        }],
        iconUrl:  logo,
        buttons:  [{title : 'Open'}]
    };

    chrome.notifications.create("", notificationOptions, (ID) => notificationID = ID);

    chrome.notifications.onButtonClicked.addListener((ID, btnID) => {
        if (ID === notificationID) {
            if (btnID === 0) {
                chrome.storage.local.get(['settings'], (storage) => {
                    if (storage.settings !== undefined) {
                        if (!storage.settings["popup"]) {
                            window.open("https://www.twitch.tv/"+name, "_about");
                        } else {
                            const popupWidth  = 900;
                            const popupHeight = 650;
                            const left        = (screen.width/2) - (popupWidth/2);
                            const top         = (screen.height/2) - (popupHeight/2);

                            // open the popout window of the stream and close the notification
                            window.open("https://player.twitch.tv/?channel="+name+
                                        "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                                        "_about", "width="+popupWidth+",height="+popupHeight+",left="+left+",top="+top);
                        }
                    }
                });

                chrome.notifications.clear(notificationID);
            }
        }
    });
}

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
                    if (storage.settings["notifications"] && notificationStatus) showNotification(channelNew);
                }
            });
        }
    }
});

// TTV live extension helps you keep track of who is live out of the
// channels you follow on twitch.tv
//
// Copyright (C) 2022 s4my <samy.hacker@gmail.com>
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
