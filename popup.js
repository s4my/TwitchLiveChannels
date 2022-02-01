(function () {
    function numberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function updateUI() {
        chrome.storage.local.get(['liveChannels'], (result) => {
            result.liveChannels.sort(compareCategories);
            result.liveChannels.sort(compareViewers);

            // if there are no channels live set badge to '0'
            if (result.liveChannels.length === 0) {
                chrome.browserAction.setBadgeBackgroundColor({color: [106, 117, 242, 255]});
                chrome.browserAction.setBadgeText({'text': '0'});
            } else {
                // hide the nostream div if there are streams online
                $('.nostream').hide();
            }

            document.getElementsByClassName("content")[0].innerHTML = "";

            for (channel of result.liveChannels) {
                const name     = channel.name;
                const category = channel.category;
                const viewers  = numberWithCommas(channel.viewers);
                const title    = channel.title.replace(/"/g, "&quot;");
                const type     = (channel.type === 'live') ? '':' VOD';

                // if the category doesn't exist create it and add the stream to it
                if (document.getElementsByClassName(category).length === 0) {
                    document.getElementsByClassName("content")[0].innerHTML += `
                        <div class="${category}">
                            <p class="category">${category}</p>
                            <div class="name${type}" title="${title}" data-url="https://player.twitch.tv/?channel=${name}">
                                ${name}
                                <span class="viewerCount">${viewers}</span>
                            </div>
                        </div>`;
                } else {
                    // if the category already exists, check if the stream isn't already added
                    let streamers = []
                    for (streamer of document.getElementsByClassName(category)[0].getElementsByClassName("name")) {
                        streamers.push(streamer.innerHTML.split('<')[0].trim());
                    }
                    if (!streamers.includes(name)) {
                        document.getElementsByClassName(category)[0].innerHTML += `
                        <div class="name${type}" title="${title}" data-url="https://player.twitch.tv/?channel=${name}">
                            ${name}
                            <span class="viewerCount">${viewers}</span>
                        </div>`;
                    }
                }
            }
        });
    }

    // sort the categories alphabetically
    function compareCategories(a, b) {
        const categoryA = a.category.toUpperCase();
        const categoryB = b.category.toUpperCase();

        if (categoryA > categoryB) return 1;
        else return -1;
    }

    // sort viewers from highest to lowest
    function compareViewers(a, b) {
        if (a.category == b.category) {
            const viewersA = a.viewers;
            const viewersB = b.viewers;

            if (viewersA > viewersB) return -1;
            else return 1;
        }
    }

    // update the UI every time the popup is opened
    updateUI();

    // update the UI if the message "updateUI" is received from background.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message === "updateUI") {
            updateUI();
            $(".updateBtn").css("background-image", "url('/icons/update_done.png')");
            setTimeout(() => {$(".updateBtn").css("background-image", "url('/icons/update.png')")}, 2000);
        }
    });

    $(document).ready(function() {
        $(".updateBtn").click(function() {
            // tell background.js to fetch an update.
            chrome.runtime.sendMessage({"message": "update"});

            $(".updateBtn").css("background-image", "url('/icons/loading.gif')");
        });

        $(".category").click(function() {
            window.open("https://www.twitch.tv/directory/game/"+$(this).text().trim(), "_blank");
        });

        // open streams on a popup windows (centered on screen)
        $('.name').click(function() {
            const popupWidth  = 900;
            const popupHeight = 650;

            const left = (screen.width/2)-(popupWidth/2);
            const top  = (screen.height/2)-(popupHeight/2);

            const windowsOptions = 'width='+popupWidth+',height='+popupHeight+',left='+left+',top='+top;

            const popupWindow = window.open($(this).attr("data-url")+
                "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                '_about', windowsOptions);
            popupWindow.focus();
        });
    });
}());
