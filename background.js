async function httpRequest(url) {
    const response = await fetch (
        url,
        {
            method: 'GET',
            headers: {
                'Accept':    'application/vnd.twitchtv.v5+json',
                'Client-ID': 'haeyonp05j4wiphav3eppivtdsvlyoq'
            }
        }
    );

    let followedChannels = await response.json();
    let liveChannels = [];

    for (channel of followedChannels.follows) {
        let id   = channel.channel._id;
        let name = channel.channel.name;

        // fetch live status
        let liveURL = 'https://api.twitch.tv/kraken/streams/'+id;
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

        let channelStatus = await response.json();

        if (channelStatus.stream !== null) {
            let stream_type = '';
            if (channelStatus.stream.stream_type === 'playlist') {stream_type = 'VOD';}
            else if (channelStatus.stream.stream_type === 'live') {stream_type = 'live'}

            console.log(name+' is LIVE');

            let category = (channelStatus.stream.channel.game === '') ?
                            'UNDEFINED':channelStatus.stream.channel.game;

            let viewers =  channelStatus.stream.viewers;
            let title   =  channelStatus.stream.channel.status;

            let data = {
                'name':     name,
                'category': category,
                'viewers':  viewers,
                'title':    title,
                'type':     stream_type
            };

            liveChannels.push(data);
        }
    }

    chrome.storage.local.set({'liveChannels': liveChannels});
    console.log(liveChannels);
}


function updateBadge(liveChannelCounter) {
    console.log('updating the badge');
    let badgeColor = [106, 117, 242, 255];

    chrome.browserAction.setBadgeBackgroundColor({color: badgeColor});
    chrome.browserAction.setBadgeText({"text": liveChannelCounter});
}

function fetchDATA(url) {
    httpRequest(url).catch(error => {
        console.log("Error: ${error}");
    });
}

//fetch list of all followed channels
let timeDelay = 60*1000*2; //2min
let URL = 'https://api.twitch.tv/kraken/users/123144592/follows/channels?limit=100&offset=0';

fetchDATA(URL);
// fetch data every 2min
setInterval(fetchDATA, timeDelay, URL);

// update when the updateBtn is clicked on the popup.html
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.message === "update") {
            httpRequest(URL).catch(error => {
                console.log("Error: ${error}");
            });
        }
    }
);

chrome.storage.onChanged.addListener(function(storedData, namespace) {
    if(storedData.liveChannels !== undefined) {
        // check for each channel if it's already in the storedData,
        // if not, show notification and update the badge.
        for (channelNew of storedData.liveChannels.newValue) {
            let notification_status = true;
            let liveChannelCounter  = storedData.liveChannels.newValue.length;

            if (storedData.liveChannels.oldValue.length > 0)
            {
                for (channelOld of storedData.liveChannels.oldValue) {
                    if (channelNew.name === channelOld.name) {
                        notification_status = false;
                        break;
                    } else {
                        notification_status = true;
                    }
                }
            }

            chrome.browserAction.getBadgeText({}, function(oldbadgetext) {
                if (oldbadgetext !== liveChannelCounter) {
                    updateBadge(liveChannelCounter.toString());
                }
            });

            if(notification_status) {showNotification(channelNew);}
        }
    }
});


function showNotification(channel) {
    let notificationID = null;
    let name           = channel.name;
    let category       = channel.category;

    let notificationOptions = {
        title:    'TTV live channels',
        priority: 0,
        type:     'list',
        message:  ``,
        items:    [{
            title   : name,
            message : ` is Live streaming ${category}`
        }],
        iconUrl:  chrome.runtime.getURL("icons/icon-48.png"),
        buttons:  [{title : 'Open'}]
    };

    chrome.notifications.create("", notificationOptions, function(ID) {
        notificationID = ID;
    });

    chrome.notifications.onButtonClicked.addListener(function(ID, btnID) {
        if (ID === notificationID) {
            if (btnID === 0) {
                let popupWidth  = 900;
                let popupHeight = 650;

                let left = (screen.width/2)-(popupWidth/2);
                let top  = (screen.height/2)-(popupHeight/2);

                let windowsOptions = 'width='+popupWidth+',height='+popupHeight+',left='+left+',top='+top;

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
