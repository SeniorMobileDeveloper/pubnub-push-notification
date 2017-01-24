/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var channel = 'mchat';
var p;
var pushNotification;
var platform;
var app = {
    isCordovaApp: (typeof window.cordova !== "undefined"),

    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        if (this.isCordovaApp)
            document.addEventListener('deviceready', this.onDeviceReady, false);
        else
            window.setTimeout(this.onDeviceReady, 0);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    
    onDeviceReady: function() {
        if(window.plugins){
            pushNotification = window.plugins.pushNotification;
            if (pushNotification) {
                platform = device.platform;
                if (device.platform == 'android' || device.platform == 'Android' || device.platform == 'amazon-fireos') {
                    pushNotification.register(successHandler, errorHandler, { "senderID": "675623589870", "ecb": "onNotification" });        // required!

                } else {
                    pushNotification.register(tokenHandler, errorHandler, { "badge": "true", "sound": "true", "alert": "true", "ecb": "onNotificationAPN" });    // required!
                }
            }
        }
        app.main();
    },

    main: function() {
        p = PUBNUB.init({
            subscribe_key: 'sub-c-a0ff1dda-50ee-11e5-854b-02ee2ddab7fe',
            publish_key:   'pub-c-38abece7-ed84-493a-b512-9b2d47ba8b62'
//            subscribe_key: 'sub-c-bcbe45ce-50ed-11e5-bfbc-02ee2ddab7fe',
//            publish_key:   'pub-c-c5ea4bf2-a58c-4c22-9aba-1d7e5ba46856'
        });

        var output = p.$('output'), 
            input = p.$('input'), 
            button = p.$('button'),
            avatar = p.$('avatar'),
            presence = p.$('presence');

        // Assign a random avatar in random color
        avatar.className = 'face-' + ((Math.random() * 13 + 1) >>> 0) + ' color-' + ((Math.random() * 10 + 1) >>> 0);

        p.subscribe({
            channel  : channel,
            callback : function(m) { 
                output.innerHTML = '<p><i class="' + m.avatar + '"></i><span>' +  m.text.replace( /[<>]/ig, '' ) + '</span></p>' + output.innerHTML; 
            },
            presence: function(m){
                if(m.occupancy > 1) {
                    presence.textContent = m.occupancy + ' people online';
                } else {
                    presence.textContent = 'Nobody else is online';
                }
            }
        });

        p.bind('keyup', input, function(e) {
            (e.keyCode || e.charCode) === 13 && publish()
        });

        p.bind('click', button, publish);

        function publish() {
            var message = PNmessage();
            message.pubnub = p;
            message.callback = function(msg){ console.log(msg); };
            message.error = function (msg){ alert(JSON.stringify(msg)); };
            
            message.channel = channel;
            message.avatar = avatar.className;
            message.text = input.value;

            //if (platform == 'android' || platform == 'Android') {
                message.gcm = {
                    title: 'Push Demo',
                    message: input.value
                };
            //}
            //else {
                message.apns = {
                    alert: input.value,
                    sound: 'default',
                    additional: 'custom ID : 12345'
                };
            //}
            message.publish();
        }

    }
};

// handle APNS notifications for iOS
function onNotificationAPN(e) {
    alert(e.additional);
    if (e.alert) {
        console.log('RECEIVED:' + e.event);
        navigator.notification.alert(e.alert);
    }
    
    if (e.sound) {
        // playing a sound also requires the org.apache.cordova.media plugin
        var snd = new Media(e.sound);
        snd.play();
    }
    
    if (e.badge) {
        pushNotification.setApplicationIconBadgeNumber(successHandler, e.badge);
    }
}

// handle GCM notifications for Android
function onNotification(e) {
    alert(JSON.stringify(e));
    console.log('RECEIVED:' + e.event);
    
    switch( e.event )
    {
        case 'registered':
            if ( e.regid.length > 0 )
            {
                console.log('<li>REGISTERED -> REGID:' + e.regid + "</li>");
                p.mobile_gw_provision ({
                    device_id: e.regid, // Reg ID you got on your device
                    channel  : channel,
                    op: 'add',
                    gw_type: 'gcm',
                    error : function(msg){console.log(msg);},
                    callback : successCallback
                });
            }
            break;
            
        case 'message':
            // if this flag is set, this notification happened while we were in the foreground.
            // you might want to play a sound to get the user's attention, throw up a dialog, etc.
            if (e.foreground)
            {
                console.log('<li>--INLINE NOTIFICATION--' + '</li>');
                
                // on Android soundname is outside the payload.
                // On Amazon FireOS all custom attributes are contained within payload
                var soundfile = e.soundname || e.payload.sound;
                // if the notification contains a soundname, play it.
                // playing a sound also requires the org.apache.cordova.media plugin
                var my_media = new Media("/android_asset/www/"+ soundfile);
                my_media.play();
            }
            else
            {   // otherwise we were launched because the user touched a notification in the notification tray.
                if (e.coldstart)
                    console.log('<li>--COLDSTART NOTIFICATION--' + '</li>');
                else
                    console.log('<li>--BACKGROUND NOTIFICATION--' + '</li>');
            }
            
            console.log('<li>MESSAGE -> MSG: ' + e.payload.message + '</li>');
            //android only
            console.log('<li>MESSAGE -> MSGCNT: ' + e.payload.msgcnt + '</li>');
            //amazon-fireos only
            console.log('<li>MESSAGE -> TIMESTAMP: ' + e.payload.timeStamp + '</li>');
            break;
            
        case 'error':
            console.log('<li>ERROR -> MSG:' + e.msg + '</li>');
            break;
            
        default:
            console.log('<li>EVENT -> Unknown, an event was received and we do not know what it is</li>');
            break;
    }
}

function tokenHandler (result) {
    console.log('<li>token: '+ result +'</li>');
    p.mobile_gw_provision ({
        device_id: result, // Reg ID you got on your device
        channel  : channel,
        op: 'add',
        gw_type: 'apns',
        error : function(msg){console.log(msg);},
        callback : successCallback
    });
    // Your iOS push server needs to know the token before it can push to this device
    // here is where you might want to send it the token for later use.
}

function successHandler (result) {
    console.log('<li>success:'+ result +'</li>');
    
}

function errorHandler (error) {
    console.log('<li>error:'+ error +'</li>');
}

var successCallback =  function() {
//    console.log(JSON.stringify(res));
    
}

app.initialize();