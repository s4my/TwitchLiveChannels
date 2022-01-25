(function () {
    function updateUI(name, category, viewers, title, type) {
        // hide the nostream div if there are streams online
        jQuery('.nostream').hide();

        // if the category doesn't exist do
        if (document.getElementsByClassName(category).length == 0) {
            document.getElementsByClassName("content")[0].innerHTML += `
                <div class="${category}"><p class="category">${category}</p>
                <div class="name${type}" title="${title}" data-url="https://player.twitch.tv/?channel=${name}">
                    ${name}
                    <span class="viewerCount">${viewers}</span>
                </div>
                </div>`;
        } else {
            // if the category exists already do check if the stream isn't already added
            if(document.getElementsByClassName('name')[0].innerHTML.split('<')[0].trim() !== name) {
                document.getElementsByClassName(category)[0].innerHTML += `
                <div class="name${type}" title="${title}" data-url="https://player.twitch.tv/?channel=${name}">
                    ${name}
                    <span class="viewerCount">${viewers}</span>
                </div>`;
            }
        }
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
    chrome.storage.local.get(['liveChannels'], function(result) {
        // sorting the result by category in alphabetical order
        result.liveChannels.sort(compareCategories);
        // sorting in descending order the viewer count
        result.liveChannels.sort(compareViewers);

        // if there are no channels live set badge to '0'
        if (result.liveChannels.length === 0) {
            let badgeColor = [106, 117, 242, 255];

            chrome.browserAction.setBadgeBackgroundColor({color: badgeColor});
            chrome.browserAction.setBadgeText({'text': '0'});
        }

        for (channel of result.liveChannels) {
            let name     = channel.name;
            let category = channel.category;
            let viewers  = channel.viewers;
            let title    = channel.title.replace(/"/g, "&quot;");
            let type     = (channel.type === 'live') ? '':' VOD';

            updateUI(name, category, viewers, title, type);
        }
    });

    function animate_updateBtn(d) {
        let updateBtn = jQuery(".updateBtn");

        jQuery({deg: 0}).animate({deg: d}, {
            duration: 2000,
            step:     function(now) {
                updateBtn.css({transform: "rotate(" + now + "deg)"});
            }
        });

        setTimeout(function() {
            let imageUrl = '/icons/update_done.png';
            jQuery(".updateBtn").css("background-image", "url(" + imageUrl + ")");
        }, 2000)
    }

    $(document).ready(function () {
        jQuery(".updateBtn").click(function() {
            // tell background.js to fetch an update.
            chrome.runtime.sendMessage({"message": "update"});
            animate_updateBtn(360);
        });

        // open streams on a popup windows (centered on screen)
        jQuery('.name').click(function() {
            let popupWidth  = 900;
            let popupHeight = 650;

            let left = (screen.width/2)-(popupWidth/2);
            let top  = (screen.height/2)-(popupHeight/2);

            let windowsOptions = 'width='+popupWidth+',height='+popupHeight+',left='+left+',top='+top;

            let popupWindow = window.open(jQuery(this).attr("data-url")+
                "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                '_about', windowsOptions);
            popupWindow.focus();
        });
    });
}());
