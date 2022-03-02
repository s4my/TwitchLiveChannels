// Copyright (C) 2022 s4my <samydevacnt@gmail.com>
// See end of file for extended copyright information.

(function () {
    "use strict";

    function numberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function updateBadge(counter) {
        chrome.browserAction.setBadgeBackgroundColor({color: "#6a75f2"});
        chrome.browserAction.setBadgeText({"text": counter});
    }

    function updateUI() {
        chrome.storage.local.get(["liveChannels", "loggedin"], (storage) => {
            const nostreamDiv = document.getElementById("nostream");

            if (!storage.loggedin) {
                updateBadge('0');
                nostreamDiv.innerHTML =
                    `This extension requires your public twitch account information.<br/><br/>
                    You need to <a href="" id="login">Log In</a> to give it authorization
                    to get the list of channels you follow.`;

                document.getElementById("streams").innerHTML = "";
                return;
            } else {
                if (!storage.liveChannels || storage.liveChannels.length === 0) {
                    updateBadge('0');
                    nostreamDiv.textContent = "None of the channels you follow are currently live."
                    document.getElementById("streams").innerHTML = "";

                    return;
                } else document.getElementById("nostream").style.display = "none";
            }

            document.getElementById("streams").innerHTML = "";

            updateBadge(storage.liveChannels.length.toString());

            for (const channel of storage.liveChannels) {
                const name     = channel.name;
                const category = channel.category;
                const viewers  = numberWithCommas(channel.viewers);
                const title    = channel.title;
                const logo     = channel.logo.replace("300x300", "70x70");

                const streamsDiv = document.getElementById("streams");
                streamsDiv.innerHTML += `
                    <div class="stream">
                        <div class="logo">
                            <img src="" width="32px" height="32px" style="border-radius: 50%;"/>
                        </div>
                        <div class="streamer"></div>
                        <div class="category"></div>
                        <div class="viewers"><span class="live-logo"></span><span></span></div>
                    </div>
                `;

                let streamDiv = Array.from(document.getElementsByClassName("stream")).pop();
                streamDiv.setAttribute("title", title);

                let logoDiv = Array.from(document.getElementsByClassName("logo")).pop();
                logoDiv.children[0].setAttribute("src", logo);

                let streamerDiv = Array.from(document.getElementsByClassName("streamer")).pop();
                streamerDiv.textContent = name;

                let categoryDiv = Array.from(document.getElementsByClassName("category")).pop();
                categoryDiv.textContent = category;

                let viewersDiv = Array.from(document.getElementsByClassName("viewers")).pop();
                viewersDiv.children[1].textContent = viewers;
            }
        });
    }

    // update the UI every time the popup is opened
    updateUI();
    chrome.storage.local.get(["settings"], (storage) => {
        // by default the theme is set to Auto
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }

        if (storage.settings !== undefined) {
            if (storage.settings["theme"] === 1/*Light*/) {
                document.body.classList.remove("dark-theme");
            } else if (storage.settings["theme"] === 2/*Dark*/) {
                document.body.classList.add('dark-theme');
            }
        }
    });

    // update the UI if the message "updateUI" is received from background.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message === "updateUI") {
            updateUI();
            document.getElementById("updateBtn").style.backgroundImage = "";
            document.getElementById("updateBtn").style.cursor = "pointer";
            document.getElementById("updateBtn").style.pointerEvents = "";
        }
    });

    // update the UI according to the extension's `status`
    chrome.storage.local.get(["status"], (storage) => {
        if (storage.status !== undefined) {
            const updateBtn = document.getElementById("updateBtn");
            const nostream  = document.getElementById("nostream");

            if (storage.status === "updating") {
                nostream.textContent = "Fetching update please wait...";
                updateBtn.style.backgroundImage = "url('/icons/loading.gif')";
                updateBtn.style.cursor          = "unset";
                updateBtn.style.pointerEvents   = "none";
            } else {
                if (!storage.loggedin) {
                    nostream.innerHTML =
                        `This extension requires your public twitch account information.<br/><br/>
                        You need to <a href="" id="login">Log In</a> to give it authorization
                        to get the list of channels you follow.`;
                } else {
                    nostream.textContent = "None of the channels you follow are currently live.";
                }
                updateBtn.style.backgroundImage = "";
                updateBtn.style.cursor          = "pointer";
                updateBtn.style.pointerEvents   = "";
            }
        }
    });

    // auto hide the scrollbar
    let hideScrollbarStyle = document.createElement("style");
    hideScrollbarStyle.id = "remove-scrollbar";
    if (navigator.userAgent.indexOf("Chrome") > -1) {
        hideScrollbarStyle.textContent = "#streams::-webkit-scrollbar{display:none !important}";
    } else if (navigator.userAgent.indexOf("Firefox") > -1) {
        hideScrollbarStyle.textContent = "#streams{scrollbar-width: none !important}";
    }

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

    window.addEventListener("click", (event) => {
        if (event.target.id === "updateBtn") {
            chrome.storage.local.get(["status"], (storage) => {
                if (!storage.status || storage.status === "done") {
                    // tell background.js to fetch an update.
                    chrome.runtime.sendMessage({"message": "update"});

                    document.getElementById("updateBtn").style.backgroundImage = "url('/icons/loading.gif')";
                    document.getElementById("updateBtn").style.cursor = "unset";
                    document.getElementById("updateBtn").style.pointerEvents = "none";
                }
            });
        } else if (event.target.id === "settings") {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL("options.html"));
            }
        } else if (event.target.id === "login") {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
        }

        if (event.target.matches(".stream, .streamer, .logo, .viewers, .category")) {
            const name = event.target.closest(".stream").getElementsByClassName("streamer")[0]
                         .textContent.toLowerCase();

            chrome.storage.local.get(['settings'], (storage) => {
                if (storage.settings !== undefined) {
                    if (!storage.settings["popup"]) {
                        window.open("https://www.twitch.tv/"+encodeURIComponent(name), "_about");
                    } else {
                        const popupWidth  = 900;
                        const popupHeight = 650;
                        const left        = (screen.width/2) - (popupWidth/2);
                        const top         = (screen.height/2) - (popupHeight/2);

                        window.open("https://player.twitch.tv/?channel=" + encodeURIComponent(name) +
                            "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                            '_about', 'width='+popupWidth+',height='+popupHeight+',left='+left+',top='+top);
                    }
                }
            });
        }
    });
}());

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
