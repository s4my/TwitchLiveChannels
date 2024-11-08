// Copyright (C) 2022 s4my <samydevacnt@gmail.com>
// See end of file for extended copyright information.

window.onload = function() {
    const channel        = document.URL.split('=')[1].split('&')[0];
    const playerControls = document.getElementsByClassName("player-controls__right-control-group")[0];

    let button = document.createElement("div");
    button.id        = "chat-btn";
    button.innerHTML = `
       <button style="display: flex;">
           <?xml version="1.0" encoding="UTF-8" standalone="no"?>
           <svg width="20" height="20" viewBox="0 0 20 20" fill="#ffffff" focusable="false" aria-hidden="true" role="presentation">
               <path fill-rule="evenodd"
                     d="M7.828 13 10 15.172 12.172 13H15V5H5v8h2.828zM10 18l-3-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2l-3 3z"
                     clip-rule="evenodd">
               </path>
           </svg>
       </button>
       <div id="chat-tooltip">Chat</div>`;

    playerControls.insertBefore(button, playerControls.firstChild);
    document.getElementById("chat-tooltip").textContent = chrome.i18n.getMessage("chat_tooltip");

    let video_player = document.getElementsByClassName("video-player__container")[0];

    button.addEventListener("click", () => {
        video_player.style.position = "fixed";
        video_player.style.left     = "0px";

        if(!document.getElementById("chat")) {
            video_player.style.width = (document.body.clientWidth - 350).toString() + "px";

            let chat = document.createElement("iframe");
            chat.id          = "chat";
            chat.frameborder = 0;
            chat.scrolling   = "no";
            chat.src         = "https://www.twitch.tv/embed/" + encodeURIComponent(channel) +
                               "/chat/?darkpopout&parent=twitch.tv";
            chat.height      = "100%";
            chat.width       = "350";
            chat.style       = "position: fixed; top: 0px; right: 0px;";

            document.body.append(chat);
        } else {
            video_player.style.width = (document.body.clientWidth).toString() + "px";

            let chat = document.getElementById("chat");
            if (chat) document.body.removeChild(chat);
        }
    });

    window.addEventListener("resize", () => {
        if (document.getElementById("chat")) {
            video_player.style.width = (document.body.clientWidth - 350).toString() + "px";
        } else {
            video_player.style.width = (document.body.clientWidth).toString() + "px";
        }
    });
}

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
