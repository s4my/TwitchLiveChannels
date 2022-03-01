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
           <svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
           xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" class="ScIconSVG-sc-1bgeryd-1 cMQeyU" x="0px"
           y="0px" viewBox="0 6 43.333333 43.333333" xml:space="preserve" width="20" height="20" fill="#ffffff" stroke="#ffffff" stroke-width="0" id="svg887">
           <metadata id="metadata893"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type
                 rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title></dc:title></cc:Work></rdf:RDF></metadata><defs
           id="defs891" /><g id="IconsRepo_bgCarrier" />
              <path d="M 31.442425,16.189615 H 3.2846775 c -0.9879787,0 -1.7909226,0.802944 -1.7909226,1.790923 V 47.533472 L 7.8511278,41.176101 H 31.442425 c 0.987979,0 1.790923,-0.803619 1.790923,-1.791598 V 17.980538 c 0,-0.987979 -0.802944,-1.790923 -1.790923,-1.790923 z M 8.2468601,31.71095 c -1.4897344,0 -2.7012425,-1.211507 -2.7012425,-2.701241 0,-1.489736 1.2115081,-2.701243 2.7012425,-2.701243 1.4897349,0 2.7012429,1.211507 2.7012429,2.701243 0,1.489734 -1.211508,2.701241 -2.7012429,2.701241 z m 8.7790369,0 c -1.489734,0 -2.701241,-1.211507 -2.701241,-2.701241 0,-1.489736 1.211507,-2.701243 2.701241,-2.701243 1.489736,0 2.701243,1.211507 2.701243,2.701243 0,1.489734 -1.211507,2.701241 -2.701243,2.701241 z m 8.779037,0 c -1.489736,0 -2.701243,-1.211507 -2.701243,-2.701241 0,-1.489736 1.211507,-2.701243 2.701243,-2.701243 1.489734,0 2.701241,1.211507 2.701241,2.701243 0,1.489734 -1.211507,2.701241 -2.701241,2.701241 z" id="path883" style="stroke-width:0" />
              <path d="M 40.221461,8.0858959 H 10.037784 c -0.98798,0 -1.7909239,0.8029439 -1.7909239,1.7909179 V 14.838994 H 31.442425 c 1.732172,0 3.141544,1.409373 3.141544,3.141544 v 17.106965 h 7.428415 V 9.8768138 c 0,-0.987974 -0.802944,-1.7909179 -1.790923,-1.7909179 z" id="path885" style="stroke-width:0" />
           </svg>
       </button>
       <div id="chat-tooltip">Chat</div>`;

    playerControls.insertBefore(button, playerControls.firstChild);

    let video_player = document.getElementsByClassName("video-player__container")[0];

    button.addEventListener("click", () => {
        video_player.style.position = "fixed";
        video_player.style.left     = "0px";

        if(!document.getElementById("chat")) {
            video_player.style.width = (document.body.clientWidth - 350).toString()+"px";

            let chat = document.createElement("iframe");
            chat.id          = "chat";
            chat.frameborder = 0;
            chat.scrolling   = "no";
            chat.src         = "https://www.twitch.tv/embed/"+encodeURIComponent(channel)+
                               "/chat/?darkpopout&parent=twitch.tv";
            chat.height      = "100%";
            chat.width       = "350";
            chat.style       = "position: fixed; top: 0px; right: 0px;";

            document.body.append(chat);
        } else {
            video_player.style.width = (document.body.clientWidth).toString()+"px";

            let chat = document.getElementById("chat");
            if (chat) document.body.removeChild(chat);
        }
    });

    window.addEventListener("resize", () => {
        if (document.getElementById("chat")) {
            video_player.style.width = (document.body.clientWidth - 350).toString()+"px";
        } else {
            video_player.style.width = (document.body.clientWidth).toString()+"px";
        }
    });
}

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
