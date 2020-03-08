/* 
  optimization : Gets a list of online streams a user is following 
  based on a specified OAuth token.

  https://dev.twitch.tv/docs/v5/reference/streams/#get-followed-streams
*/

/*
  TODO:
    - add a refresh button
    - bug: the re-stream streams show like normal streams 'live'
    - bug: sometimes clicking on streams doesn't open the stream popout
    - implement the options 
    - to get the userID:
      https://api.twitch.tv/helix/users?login=s4my_h4ck3r
      add header:
      Client_ID: haeyonp05j4wiphav3eppivtdsvlyoq
*/


console.log('TTV live channels started.');


async function httpRequest(url){  
  const response = await fetch(url, {method: 'GET', headers: {
    'Accept'    : 'application/vnd.twitchtv.v5+json',
    'Client-ID' : 'haeyonp05j4wiphav3eppivtdsvlyoq'
  }});

  let followedChannels = await response.json();
  //console.log(followedChannels);
  
  let liveChannels = [];

  for(channel of followedChannels.follows){
    let id = channel.channel._id;
    let name = channel.channel.name;

    // fetch live status
    let liveURL    = 'https://api.twitch.tv/kraken/streams/'+id;
    const response = await fetch(liveURL, {method: 'GET', headers: {
      'Accept'    : 'application/vnd.twitchtv.v5+json',
      'Client-ID' : 'haeyonp05j4wiphav3eppivtdsvlyoq'
    }});

    let channelStatus = await response.json();
    //console.log(channelStatus);

    if(channelStatus.stream != null){
      let stream_type = '';      
      if(channelStatus.stream.stream_type == 'playlist') {
        stream_type = 'VOD';
      }else if (channelStatus.stream.stream_type == 'live'){
        stream_type = 'live'
      }

      console.log(name+' is LIVE');

      let category = (channelStatus.stream.channel.game == '') ? 
                      'UNDEFINED':channelStatus.stream.channel.game;
      
      let viewers  = channelStatus.stream.viewers;
      let title    = channelStatus.stream.channel.status;
     

      /*
        save the data to the chrome.storage in the following format 
       
        
        [{name: "greekgodx", 
          category: "Just Chatting", 
          viewers: 11344, 
          title: "IRL STREAM - @Greekgodx on Twitter", 
          type: "live"},
          ...
        ]
      */

      let data = {
        'name'     : name,
        'category' : category,
        'viewers'  : viewers,
        'title'    : title,
        'type'     : stream_type
      };


      liveChannels.push(data);    
    }        
  }

  chrome.storage.local.set({'liveChannels': liveChannels});    
  console.log(liveChannels);
}


let updateBadge = function(liveChannelCounter) {
  console.log('updating the badge');
  let badgeColor = [106, 117, 242, 255];

  chrome.browserAction.setBadgeBackgroundColor({color: badgeColor});
  chrome.browserAction.setBadgeText({"text": liveChannelCounter});

}


function fetchDATA(url){
  httpRequest(url).catch(error => {
    console.log('Error');
    console.log(error);
  });
  
}


//fetch list of all followed channels
let timeDelay = 60*1000*2; //2min
let url = 'https://api.twitch.tv/kraken/users/123144592/follows/channels?limit=100&offset=0';


fetchDATA(url);

// fetch data every timeDelay (2min by default)
setInterval(function(){
  fetchDATA(url);
}, timeDelay);


// update when the updateBtn is clicked on the popup.html
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.message == "update"){
      httpRequest(url).catch(error => {
        console.log('Error');
        console.log(error);
      });
      //console.log('fetching update...');
    }
  }
);

chrome.storage.onChanged.addListener(function(storedData, namespace) {
  // console.log(storedData.liveChannels);
  
  if(storedData.liveChannels != undefined){    
    /* 
      check foreach channel if it's already in the storedData,
      if not, show notification and update the badge.
    */
    for(channelNew of storedData.liveChannels.newValue){
      let notification_status = true;
      let updateBadgeStatus   = false;
      let liveChannelCounter  = storedData.liveChannels.newValue.length;    

      for(channelOld of storedData.liveChannels.oldValue){    
        if(channelNew.name == channelOld.name){
          notification_status = false;     
          updateBadgeStatus   = false;               
          break;
        }else{
          notification_status = true;
          updateBadgeStatus   = true;
        }        
      }

      console.log('LIVE channels: '+liveChannelCounter.toString());      

      if(updateBadgeStatus == true){
        updateBadge(liveChannelCounter.toString());
      }else{
        // call updateBadge if the badge is not set yet (at 1st run for ex.)
        chrome.browserAction.getBadgeText({}, function(oldbadgetext) {
          //console.log('Badge text = ' + oldbadgetext);
          //console.log('liveChannelCounter = ' + liveChannelCounter); 
          if(oldbadgetext != liveChannelCounter){
            updateBadge(liveChannelCounter.toString());
          }

        });
      }

      if(notification_status == true){
        showNotification(channelNew);
      }
    }

    console.log('------------------------------------------------------------------');
  }
});


function showNotification(channel){
  let notificationID = null;
  let name           = channel.name;
  let category       = channel.category;

  console.log("showing notification for "+name);
  let notificationOptions = {
    title    : 'TTV live channels',
    priority : 0,
    type     : 'list',
    message  : `${name} is Live streaming ${category}`,
    items    : [{title: name, message: ` is Live streaming ${category}`}],
    iconUrl  : chrome.runtime.getURL("icons/icon-48.png"),
    buttons  : [{title : 'Open'}]
  };
  
  chrome.notifications.create("", notificationOptions, function(ID){
    notificationID = ID;
  });
  
  
  chrome.notifications.onButtonClicked.addListener(function(ID, btnID) {
    if (ID == notificationID) {
      if (btnID == 0) {  
        let popupWidth  = 900;
        let popupHeight = 650;
    
        let left = (screen.width/2)-(popupWidth/2);
        let top  = (screen.height/2)-(popupHeight/2);
        
        let windowsOptions = '?enableExtensions=true&muted=false&player=popout&volume=1,width='+
                              popupWidth+',height='+popupHeight+',left='+left+',top='+top;
        
        // open the popout window of the stream and close the notification
        window.open('https://player.twitch.tv/?channel='+name, '_blank', windowsOptions);
        chrome.notifications.clear(notificationID);
      }
    }
  });
}

