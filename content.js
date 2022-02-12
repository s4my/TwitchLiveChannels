// Copyright (C) 2022 s4my <samy.hacker@gmail.com>
// See end of file for extended copyright information.

window.onload = function() {
    const channel       = document.URL.split('=')[1].split('&')[0];
    const playerButtons = document.getElementsByClassName('player-controls__right-control-group');

    let button = document.createElement('div');
    button.className = 'chatBtn';
    button.style     = 'font-weight: bold;';
    button.innerHTML = `
    <div aria-describedby="ec3d0550c404c5736508b1ef6b8d4373" class="Layout-sc-nxg1ff-0 ScAttachedTooltipWrapper-sc-v8mg6d-0 jrXOjD">
       <button class="ScCoreButton-sc-1qn4ixc-0 fVEFfF ScButtonIcon-sc-o7ndmn-0 jGcDiv"
       aria-label="Chat" data-a-target="player-clip-button">
          <div class="ScButtonIconFigure-sc-o7ndmn-1 fppMur">
             <div class="ScIconLayout-sc-1bgeryd-0 cOOGTE tw-icon">
                <div class="ScAspectRatio-sc-1sw3lwy-1 bneAWp tw-aspect">
                   <div class="ScAspectSpacer-sc-1sw3lwy-0 gMCXS"></div>
                   <svg version="1.1" class="ScIconSVG-sc-1bgeryd-1 cMQeyU"
                       xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 6 65 65"
                       style="enable-background:new 0 0 60 60;" xml:space="preserve" width="30px" height="30px"
                       fill="#ffffff" stroke="#ffffff" stroke-width="0"><g id="IconsRepo_bgCarrier"></g>
                       <path d="M44.348,12.793H2.652C1.189,12.793,0,13.982,0,15.445v43.762l9.414-9.414h34.934c1.463,0,
                       2.652-1.19,2.652-2.653V15.445 C47,13.982,45.811,12.793,44.348,12.793z M10,35.777c-2.206,
                       0-4-1.794-4-4s1.794-4,4-4s4,1.794,4,4S12.206,35.777,10,35.777z M23,35.777c-2.206,
                       0-4-1.794-4-4s1.794-4,4-4s4,1.794,4,4S25.206,35.777,23,35.777z M36,35.777c-2.206,
                       0-4-1.794-4-4s1.794-4,4-4 s4,1.794,4,4S38.206,35.777,36,35.777z"></path>
                       <path d="M57.348,0.793H12.652C11.189,0.793,10,1.982,10,3.445v7.348h34.348c2.565,0,4.652,2.087,
                       4.652,4.652v25.332h11V3.445 C60,1.982,58.811,0.793,57.348,0.793z"></path>
                    </svg>
                </div>
             </div>
          </div>
       </button>
       <div class="ScAttachedTooltip-sc-v8mg6d-1 kVzNwn tw-tooltip"
       data-a-target="tw-tooltip-label" role="tooltip" id="ec3d0550c404c5736508b1ef6b8d4373"
       direction="top">Chat</div>
    </div>`;

    // TODO: use my own style instead of relying on twitch's styles that are unstable

    playerButtons[0].insertBefore(button, playerButtons[0].firstChild);

    let video_player = document.getElementsByClassName('video-player__container')[0];

    button.addEventListener("click", () => {
        video_player.style.position = "fixed";
        video_player.style.left     = "0px";

        if(document.getElementsByClassName("chat").length === 0){
            video_player.style.width = (document.body.clientWidth - 350).toString()+"px";

            let chat = document.createElement("iframe");
            chat.className   = "chat";
            chat.id          = channel;
            chat.frameborder = 0;
            chat.scrolling   = 'no';
            chat.src         = "https://www.twitch.tv/embed/"+encodeURI(channel)+"/chat/?darkpopout&parent=twitch.tv";
            chat.height      = "100%";
            chat.width       = "350";
            chat.style       = "position: fixed; top: 0px; right: 0px;";

            document.body.append(chat);
        } else {
            video_player.style.width = (document.body.clientWidth).toString()+"px";
            let chat                 = document.getElementsByClassName('chat')[0];
            chat.parentNode.removeChild(chat);
        }
    }, false);

    window.addEventListener('resize', () => {
        if (document.getElementsByClassName("chat").length === 1) {
            video_player.style.width = (document.body.clientWidth - 350).toString()+"px";
        } else {
            video_player.style.width = (document.body.clientWidth).toString()+"px";
        }
    });
}

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
