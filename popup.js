// Copyright (C) 2022 s4my <samydevacnt@gmail.com>
// See end of file for extended copyright information.

(function () {
    "use strict";

    const settingsBtn = document.getElementById("settings");
    const updateBtn = document.getElementById("update-btn");
    const title = document.getElementById("title_txt");
    const nostreamDiv = document.getElementById("nostream");
    const streamsDiv = document.getElementById("streams");

    function numberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function updateBadge(counter) {
        chrome.browserAction.setBadgeBackgroundColor({color: "#6a75f2"});
        chrome.browserAction.setBadgeText({"text": counter});
    }

    function updateUI() {
        settingsBtn.textContent = chrome.i18n.getMessage("settings_btn");
        updateBtn.title = chrome.i18n.getMessage("update_btn");
        title.textContent = chrome.i18n.getMessage("title");

        chrome.storage.local.get(["liveChannels", "loggedin"], (storage) => {
            if (!storage.loggedin) {
                updateBadge("0");
                updateBtn.style.display = "none";
                nostreamDiv.childNodes[0].textContent = chrome.i18n.getMessage("nostream_loggedout_01");
                nostreamDiv.childNodes[3].textContent = chrome.i18n.getMessage("nostream_loggedout_02");
                nostreamDiv.childNodes[4].textContent = chrome.i18n.getMessage("nostream_loggedout_03");
                nostreamDiv.childNodes[5].textContent = chrome.i18n.getMessage("nostream_loggedout_04");

                streamsDiv.innerHTML = "";
                return;
            } else {
                updateBtn.style.display = "block";
                if (!storage.liveChannels || storage.liveChannels.length === 0) {
                    updateBadge("0");
                    nostreamDiv.textContent = chrome.i18n.getMessage("nostream_loggedin");
                    nostreamDiv.style.display = "block";
                    streamsDiv.innerHTML = "";

                    return;
                } else nostreamDiv.style.display = "none";
            }

            streamsDiv.innerHTML = "";

            updateBadge(storage.liveChannels.length.toString());

            for (const channel of storage.liveChannels) {
                const name = channel.name;
                const category = channel.category;
                const viewers = numberWithCommas(channel.viewers);
                const title = channel.title;
                const logo = channel.logo.replace("300x300", "70x70");

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
        // by default the theme is set to Auto before the settings are even set.
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }

        if (storage.settings !== undefined) {
            if (storage.settings["theme"] === 1/*Light*/) {
                document.body.classList.remove("dark-theme");
            } else if (storage.settings["theme"] === 2/*Dark*/) {
                document.body.classList.add("dark-theme");
            }
        }
    });

    // update the UI if the message "updateUI" is received from background.js
    chrome.runtime.onMessage.addListener((request) => {
        if (request.message === "updateUI") updateUI();
    });

    // update the UI according to the extension's `status` when fetching an update in the
    // background.
    chrome.storage.onChanged.addListener((storage) => {
        if (storage.status !== undefined) {
            if (storage.status.newValue === "updating") {
                nostreamDiv.textContent = chrome.i18n.getMessage("nostream_updating");
                updateBtn.style.backgroundImage = "url('/icons/loading.gif')";
                updateBtn.style.cursor = "unset";
                updateBtn.style.pointerEvents = "none";
            } else {
                chrome.storage.local.get(["loggedin"], (storage) => {
                    if (storage.loggedin !== undefined) {
                        if (!storage.loggedin) {
                            updateBadge("0");
                            updateBtn.style.display = "none";
                            nostreamDiv.innerHTML = `
                                This extension requires your public Twitch account information.<br/><br/>
                                You need to <a href="#" id="login">Log In</a> to give it authorization
                                to get the list of channels you follow.`;
                            nostreamDiv.childNodes[0].textContent = chrome.i18n.getMessage("nostream_loggedout_01");
                            nostreamDiv.childNodes[3].textContent = chrome.i18n.getMessage("nostream_loggedout_02");
                            nostreamDiv.childNodes[4].textContent = chrome.i18n.getMessage("nostream_loggedout_03");
                            nostreamDiv.childNodes[5].textContent = chrome.i18n.getMessage("nostream_loggedout_04");
                        } else {
                            nostreamDiv.textContent = chrome.i18n.getMessage("nostream_loggedin");
                        }
                    }
                });

                updateBtn.style.backgroundImage = "";
                updateBtn.style.cursor = "pointer";
                updateBtn.style.pointerEvents = "";
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

    if (navigator.userAgent.indexOf("Win") > -1) {
        document.getElementById("streams").style.scrollbarWidth = "thin";
    }

    window.addEventListener("click", (event) => {
        if (event.target.id === "update-btn") {
            chrome.storage.local.get(["status", "loggedin"], (storage) => {
                if (storage.loggedin !== undefined && storage.loggedin) {
                    if(!storage.status || storage.status === "done") {
                        // tell background.js to fetch an update.
                        chrome.runtime.sendMessage({"message": "update"});
                    }
                }
            });
        } else if (event.target.id === "settings") {
            if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
            else window.open(chrome.runtime.getURL("options.html"));
        } else if (event.target.id === "login") {
            if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
            else window.open(chrome.runtime.getURL("options.html"));
        }

        if (event.target.matches(".stream, .streamer, .logo, .logo>img, .viewers>span, .category")) {
            const name = event.target.closest(".stream").getElementsByClassName("streamer")[0]
                .textContent.toLowerCase();

            chrome.storage.local.get(["settings"], (storage) => {
                if (storage.settings !== undefined) {
                    if (!storage.settings["popup"]) {
                        chrome.tabs.create({url: "https://www.twitch.tv/" + encodeURIComponent(name)});
                    } else {
                        if (navigator.userAgent.indexOf("Chrome") > -1) {
                            const popupWidth = 900;
                            const popupHeight = 650;

                            chrome.windows.create({
                                url: "https://player.twitch.tv/?channel=" + encodeURIComponent(name) +
                                     "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                                width: popupWidth,
                                height: popupHeight,
                                left: parseInt((screen.width/2) - (popupWidth/2)),
                                top: parseInt((screen.height/2) - (popupHeight/2)),
                                focused: true,
                                type: "popup"
                            });
                        } else if (navigator.userAgent.indexOf("Firefox") > -1) {
                            chrome.windows.create({
                                url: "https://player.twitch.tv/?channel=" + encodeURIComponent(name) +
                                     "&enableExtensions=true&muted=false&parent=twitch.tv&player=popout&volume=1",
                                focused: true,
                                state: "maximized",
                                type: "popup"
                            });
                        }
                    }
                    window.close();
                }
            });
        }
    });
}());

// Twitch Live Channels helps you keep track of who is live out of the channels you follow
// on Twitch (https://www.twitch.tv/).
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
