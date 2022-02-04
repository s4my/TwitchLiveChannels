(function () {
    "use strict";

    function numberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function updateUI() {
        chrome.storage.local.get(['liveChannels'], (result) => {
            result.liveChannels.sort((a, b) => {
                return (a.viewers > b.viewers) ? -1:1;
            });

            // if there are no channels live set badge to '0'
            if (result.liveChannels.length === 0) {
                chrome.browserAction.setBadgeBackgroundColor({color: "#6a75f2"});
                chrome.browserAction.setBadgeText({'text': '0'});
            } else {
                // hide the nostream div if there are streams online
                document.getElementById('nostream').style.display = "none";
            }

            document.getElementById("content").innerHTML = "";

            for (const channel of result.liveChannels) {
                const name     = channel.name;
                const category = channel.category;
                const viewers  = numberWithCommas(channel.viewers);
                const title    = channel.title.replace(/"/g, "&quot;");
                const type     = (channel.type === 'live') ? '':' VOD';
                const logo     = channel.logo;

                document.getElementById("content").innerHTML += `
                    <div class="stream" title="${title}">
                      <div class="logo">
                        <img src="${logo}" width="32px" height="32px" style="border-radius: 50%;"/>
                      </div>
                      <div class="streamer">${name}</div>
                      <div class="category">${category}</div>
                      <div class="viewers"><span class="live-logo"></span>${viewers}</div>
                    </div>
                `;
            }
        });
    }

    // update the UI every time the popup is opened
    updateUI();

    // update the UI if the message "updateUI" is received from background.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message === "updateUI") {
            updateUI();
            document.getElementById("updateBtn").style.backgroundImage = "url('/icons/update.png')";
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target.id === "updateBtn") {
            // tell background.js to fetch an update.
            chrome.runtime.sendMessage({"message": "update"});
            document.getElementById("updateBtn").style.backgroundImage = "url('/icons/loading.gif')";
        }

        // on click open the stream in a popup windows (centered on screen)
        if (event.target.matches(".stream, .streamer, .logo, .viewers, .category")) {
            const name        = event.target.closest(".stream").getElementsByClassName("streamer")[0].innerText.toLowerCase();
            const popupWidth  = 900;
            const popupHeight = 650;
            const left        = (screen.width/2) - (popupWidth/2);
            const top         = (screen.height/2) - (popupHeight/2);

            window.open("https://player.twitch.tv/?channel=" + name +
                "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                '_about', 'width='+popupWidth+',height='+popupHeight+',left='+left+',top='+top);
        }
    });
}());
