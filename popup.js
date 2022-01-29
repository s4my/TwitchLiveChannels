(function () {
    function numberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function updateUI() {
        chrome.storage.local.get(['liveChannels'], (result) => {
            // sorting the result by category in alphabetical order
            result.liveChannels.sort(compareCategories);

            // sorting in descending order the viewer count
            result.liveChannels.sort(compareViewers);

            // if there are no channels live set badge to '0'
            if (result.liveChannels.length === 0) {
                let badgeColor = [106, 117, 242, 255];

                chrome.browserAction.setBadgeBackgroundColor({color: badgeColor});
                chrome.browserAction.setBadgeText({'text': '0'});
            } else {
                // hide the nostream div if there are streams online
                $('.nostream').hide();
            }

            document.getElementsByClassName("content")[0].innerHTML = "";

            for (channel of result.liveChannels) {
                let name     = channel.name;
                let category = channel.category;
                let viewers  = numberWithCommas(channel.viewers);
                let title    = channel.title.replace(/"/g, "&quot;");
                let type     = (channel.type === 'live') ? '':' VOD';

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

        let comparison = 0;
        if (categoryA > categoryB) {comparison = 1;}
        else {comparison = -1;}

        return comparison;
    }

    // sort viewers from highest to lowest
    function compareViewers(a, b) {
        if (a.category == b.category) {
            const viewersA = a.viewers;
            const viewersB = b.viewers;

            let comparison = 0;
            if (viewersA > viewersB) {comparison = -1;}
            else {comparison = 1;}

            return comparison;
        }
    }

    // update the UI every time the popup is opened
    updateUI();
    let updateBtnIntervalID = 0

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message === "updateUI") {
            updateUI();
            clearInterval(updateBtnIntervalID);
            let imageUrl = '/icons/update_done.png';
            $(".updateBtn").css("background-image", "url(" + imageUrl + ")");
            imageUrl = '/icons/update.png';
            setTimeout(() => {$(".updateBtn").css("background-image", "url(" + imageUrl + ")")}, 2000);
        }
    });

    $(document).ready(function() {
        $(".updateBtn").click(function() {
            // tell background.js to fetch an update.
            chrome.runtime.sendMessage({"message": "update"});

            updateBtnIntervalID = setInterval(function() {
                $({deg: 0}).animate({deg: 360}, {
                    duration: 2000,
                    step:     (now) => {
                        $(".updateBtn").css({transform: "rotate(" + now + "deg)"});
                    }
                });
            }, 1000);
        });

        $(".category").click(function() {
            window.open("https://www.twitch.tv/directory/game/"+$(this).text().trim(), "_blank");
        });

        // open streams on a popup windows (centered on screen)
        $('.name').click(function() {
            let popupWidth  = 900;
            let popupHeight = 650;

            let left = (screen.width/2)-(popupWidth/2);
            let top  = (screen.height/2)-(popupHeight/2);

            let windowsOptions = 'width='+popupWidth+',height='+popupHeight+',left='+left+',top='+top;

            let popupWindow = window.open($(this).attr("data-url")+
                "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                '_about', windowsOptions);
            popupWindow.focus();
        });
    });
}());
