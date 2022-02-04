async function updateLiveChannels() {
    console.log("[~] Fetching update...");
    // fetch list of all followed channels
    try {
        const URL = 'https://api.twitch.tv/kraken/users/123144592/follows/channels?limit=100&offset=0';
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

        const followedChannels = await response.json();
        let liveChannels = [];

        for (const channel of followedChannels.follows) {
            const id   = channel.channel._id;
            const name = channel.channel.name;

            // fetch live status for each followed channel
            try {
                const liveURL = 'https://api.twitch.tv/kraken/streams/'+id;
                const response = await fetch(
                    liveURL,
                    {
                        method: 'GET',
                        headers: {
                            'Accept':    'application/vnd.twitchtv.v5+json',
                            'Client-ID': 'haeyonp05j4wiphav3eppivtdsvlyoq'
                        }
                    }
                );

                const channelStatus = await response.json();
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
        console.error(error);
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

    const response = await fetch(channel.logo);
    const blob     = await response.blob();
    const logo     = URL.createObjectURL(blob);

    const notificationOptions = {
        title:    'TTV live channels',
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
                const popupWidth  = 900;
                const popupHeight = 650;

                const left = (screen.width/2)-(popupWidth/2);
                const top  = (screen.height/2)-(popupHeight/2);

                const windowsOptions = 'width='+popupWidth+',height='+popupHeight+',left='+left+',top='+top;

                // open the popout window of the stream and close the notification
                window.open('https://player.twitch.tv/?channel='+name+
                            "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                            '_about', windowsOptions);
                window.close();

                chrome.notifications.clear(notificationID);
            }
        }
    });
}

//get list of all live channels every 2 min
updateLiveChannels();
let intervalID = setInterval(updateLiveChannels, 60*1000*2/*2 min*/);

// update when the updateBtn is clicked on the popup.html
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "update") {
        clearInterval(intervalID);
        updateLiveChannels();
    }
});

chrome.storage.onChanged.addListener((storedData, namespace) => {
    if(storedData.liveChannels !== undefined) {
        // check for each channel if it's already in the storedData,
        // if not, show notification and update the badge.
        for (const channelNew of storedData.liveChannels.newValue) {
            let notification_status  = true;
            const liveChannelCounter = storedData.liveChannels.newValue.length;

            if (storedData.liveChannels.oldValue.length > 0)
            {
                for (const channelOld of storedData.liveChannels.oldValue) {
                    if (channelNew.name === channelOld.name) {
                        notification_status = false;
                        break;
                    }
                }
            }

            chrome.browserAction.getBadgeText({}, (oldbadgetext) => {
                if (oldbadgetext !== liveChannelCounter) {
                    updateBadge(liveChannelCounter.toString());
                }
            });

            if(notification_status) showNotification(channelNew);
        }
    }
});
