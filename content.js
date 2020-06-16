console.log("twitch player detected");

// load the <script src="/scripts/tmi.min.js"></script> 
// let script = document.createElement('script');

// TODO: fails constanly to load the script ??
// script.src = chrome.runtime.getURL("/scripts/tmi.min.js");	
// document.head.append(script);

// script.onload = function() {
//   // call tmi module  
// };

// script.onerror = function() {
//   alert("Error loading " + this.src);
// };


window.onload = function(){
	let channel = document.URL.split('=')[1].split('&')[0];
	let playerButtons = document.getElementsByClassName('player-controls__right-control-group');

	let button = document.createElement('div');
	button.className = 'chatBtn';
	button.style = 		 'font-weight: bold;';
	button.innerHTML = `<div class="tw-inline-flex tw-relative tw-tooltip-wrapper">
		<button class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-button-icon--overlay tw-core-button tw-core-button--overlay tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative">
		
			<span class="tw-button-icon__icon">
				<div style="width: 2rem; height: 2rem;">
					<div class="tw-align-items-center tw-full-width tw-icon tw-icon--fill tw-inline-flex">
						<div class="tw-aspect tw-aspect--align-top">
							<div class="tw-aspect__spacer" style="padding-bottom: 100%;"></div>
							<svg version="1.1" id="IconsRepoEditor" xmlns="http://www.w3.org/2000/svg" 
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
			</span>
		</button>
		<div class="tw-tooltip tw-tooltip--align-right tw-tooltip--up">Chat</div>
	</div>`;

	// TODO: fix the chat (chat is not showing on the right side when i click the chatBtn)
	playerButtons[0].insertBefore(button, playerButtons[0].firstChild);

	button.addEventListener("click", function() {
		let video_player = document.getElementsByClassName('video-player__container')[0];
		video_player.style.position = "fixed";
		video_player.style.left = "0px";

		if(document.getElementsByClassName("chat").length == 0){
			video_player.style.width = (document.body.clientWidth - 350).toString()+"px";

			let chat =         document.createElement("iframe");
			chat.className =   "chat";
			chat.id =          channel;
			chat.frameborder = 0;
			chat.scrolling =   'no';
			chat.src =         "https://www.twitch.tv/embed/"+channel+"/chat/?darkpopout&parent=twitch.tv";
			chat.height =      "100%";
			chat.width =       "350";
			chat.style =       "position: fixed; top: 0px; right: 0px;";

			document.body.append(chat);
		}else{
			video_player.style.width = (document.body.clientWidth).toString()+"px";
			let chat = document.getElementsByClassName('chat')[0];
			chat.parentNode.removeChild(chat);
		}
		

		// /*
		// 	- fix the position and style, and may add the emoticons button
		// 	- need add chat features such as @username
		// 	- make it so that when i hit return the message is sent,
		// 		then hide the chatForm (remove it from the DOM), or maybe when i click away 
		// 		hide the form, or when a certain time is elapsed.
		//	- to get chatters to be able to @ people, get list of chatters 
		//	  from https://tmi.twitch.tv/group/user/<channel>/chatters
		// */
		//
		// if(document.getElementsByClassName("chatForm").length == 0){
		// 	 let form = document.createElement('textarea');
		// 	 form.maxlength 		= 500;
		// 	 form.palceholder   = "Send a message";
		// 	 form.rows 				  = 1;
		// 	 form.className     = 'chatForm';	
		// 	 form.style.cssText = `position      : absolute;
		// 	 											 float         : right;
		// 	 											 right         : 40px;
		// 	 											 bottom        : 40px;
		// 	 											 border        : 1px;
		// 	 											 border-raduis : 5px;
		// 	 											 padding       : 3px;
		// 	 											 max-height    : 91px;
	  //   											 min-height    : 40px;
	  //   											 width         : 400px;
	  //   											 box-shadow    : 5px 5px #b565f7;`
		//
		// 	 document.body.append(form);
		// }else{
		// 	let chatForm = document.getElementsByClassName('chatForm')[0];
		// 	chatForm.parentNode.removeChild(chatForm);
		// }

  }, false);
}


// function sendMSG(){
// 	let channel = document.URL.split('=')[1];
// 	let msg = document.getElementByClassName('chatForm')[0].textContent;

// 	const client = new tmi.Client({
// 		options: { debug: true },
// 		connection: {
// 			reconnect: true,
// 			secure: true
// 		},
// 		identity: {
// 			username: 's4my_h4ck3r',
// 			password: 'oauth:1b4bv8320pv6euffqw7xg9zsf2vrmo'
// 		},
// 		channels: []
// 	});

// 	client.connect();
// 	client.say(channel, msg);
// }