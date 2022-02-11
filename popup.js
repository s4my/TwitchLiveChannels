// Copyright (C) 2022 s4my <samy.hacker@gmail.com>
// See end of file for extended copyright information.

(function () {
    "use strict";

    function numberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function updateUI() {
        chrome.storage.local.get(['liveChannels'], (storage) => {
            if (storage.liveChannels === undefined) return;
            storage.liveChannels.sort((a, b) => (a.viewers > b.viewers) ? -1:1);

            // if there are no channels live set badge to '0'
            if (storage.liveChannels.length === 0) {
                chrome.browserAction.setBadgeBackgroundColor({color: "#6a75f2"});
                chrome.browserAction.setBadgeText({'text': '0'});
            } else {
                // hide the nostream div if there are streams online
                document.getElementById('nostream').style.display = "none";
            }

            document.getElementById("streams").innerHTML = "";

            for (const channel of storage.liveChannels) {
                const name     = channel.name;
                const category = channel.category;
                const viewers  = numberWithCommas(channel.viewers);
                const title    = channel.title.replace(/"/g, "&quot;");
                const type     = (channel.type === 'live') ? '':' VOD';
                const logo     = channel.logo.replace("300x300", "70x70");

                document.getElementById("streams").innerHTML += `
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
    chrome.storage.local.get(['settings'], (storage) => {
        if (storage.settings !== undefined) {
            if (storage.settings["theme"] === 0/*Auto*/) {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.body.classList.add('dark-theme');
                } else {
                    document.body.classList.remove("dark-theme");
                }
            } else if (storage.settings["theme"] === 1/*Light*/) {
                document.body.classList.remove("dark-theme");
            } else /*Dark*/{
                document.body.classList.add('dark-theme');
            }
        }
    });

    // update the UI if the message "updateUI" is received from background.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message === "updateUI") {
            updateUI();
            document.getElementById("updateBtn").style.backgroundImage = "";
        }
    });

    // update the UI according to the extension's `status`
    chrome.storage.local.get(['status'], (storage) => {
        if (storage.status !== undefined) {
            const updateBtn = document.getElementById("updateBtn");
            const nostream  = document.getElementById("nostream");

            if (storage.status === "updating") {
                nostream.innerHTML = "Fetching DATA please wait...";
                updateBtn.style.backgroundImage = "url('/icons/loading.gif')";
            } else {
                nostream.innerHTML = "None of the channels you follow are currently live.";
                updateBtn.style.backgroundImage = "";
            }
        }
    });

    // auto hide the scrollbar
    let hideScrollbarStyle = document.createElement('style');
    hideScrollbarStyle.id          = 'remove-scrollbar';
    hideScrollbarStyle.textContent = '#streams::-webkit-scrollbar{display:none !important}';

    document.documentElement.appendChild(hideScrollbarStyle);

    document.documentElement.addEventListener("mouseover", () => {
        // show the scrollbar
        if (document.documentElement.contains(hideScrollbarStyle)) {
            document.documentElement.removeChild(hideScrollbarStyle);
        }
    });
    document.documentElement.addEventListener("mouseout", () => {
        // hide the scrollbar
        document.documentElement.appendChild(hideScrollbarStyle);
    });

    window.addEventListener('click', (event) => {
        if (event.target.id === "updateBtn") {
            // tell background.js to fetch an update.
            chrome.runtime.sendMessage({"message": "update"});
            document.getElementById("updateBtn").style.backgroundImage = "url('/icons/loading.gif')";
        }

        // on click open the stream in a popup windows (centered on screen)
        if (event.target.matches(".stream, .streamer, .logo, .viewers, .category")) {
            const name = event.target.closest(".stream").getElementsByClassName("streamer")[0].innerText.toLowerCase();

            chrome.storage.local.get(['settings'], (storage) => {
                if (storage.settings !== undefined) {
                    if (!storage.settings["popup"]) {
                        window.open("https://www.twitch.tv/"+name, "_about");
                    } else {
                        const popupWidth  = 900;
                        const popupHeight = 650;
                        const left        = (screen.width/2) - (popupWidth/2);
                        const top         = (screen.height/2) - (popupHeight/2);

                        window.open("https://player.twitch.tv/?channel=" + name +
                            "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                            '_about', 'width='+popupWidth+',height='+popupHeight+',left='+left+',top='+top);
                    }
                }
            });
        }
    });
}());

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
