$(document).ready(function() {

//================
// FIREBASE SETUP
//================

   // Initialize Firebase
  var config = {
    apiKey: "AIzaSyBcxlMvEGf_-Ms_WzguEUmTmh3xCZWc9X4",
    authDomain: "medical-chat.firebaseapp.com",
    databaseURL: "https://medical-chat.firebaseio.com",
    storageBucket: "medical-chat.appspot.com",
    messagingSenderId: "1065425949070"
  };
  firebase.initializeApp(config);

  var database = firebase.database();

  function authorizationSetup() {
     firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          // User is signed in.
          var displayName = user.displayName;
          var email = user.email;
          var emailVerified = user.emailVerified;
          var photoURL = user.photoURL;
          var uid = user.uid;
          var providerData = user.providerData;
          user.getToken().then(function(accessToken) {
            document.getElementById('sign-in-status').textContent = 'Signed in';
            document.getElementById('sign-in').textContent = 'Sign out';
            document.getElementById('account-details').textContent = JSON.stringify({
              displayName: displayName,
              email: email,
              emailVerified: emailVerified,
              photoURL: photoURL,
              uid: uid,
              accessToken: accessToken,
              providerData: providerData
            }, null, '  ');
          });
        } else {
          // User is signed out.
          document.getElementById('sign-in-status').textContent = 'Signed out';
          document.getElementById('sign-in').textContent = 'Sign in';
          document.getElementById('account-details').textContent = 'null';
        }
      }, function(error) {
        console.log(error);
      });
  }

//===========
// APP STATE
//=========== 

var appState;
function resetAppState() {
  return {
    phase: 'initialize',
    userName: 'Caryn'
  }
}


//===================
// EVENT MANAGEMENT
//==================

  $('.chat-submit').on('click', function() {
    event.preventDefault();
    var userInput = $('.chat-input').val().trim();
    // Fix this: 
    var emergencyLevel = $('.chat-emergency-level').val();
    var timestamp = moment().format();
    console.log(timestamp);
    var messageObject = {
      text: userInput,
      name: appState.userName,
      timestamp: timestamp
    };

    storeMessageOnFirebase(messageObject);
    // reset form input to show placeholder
    $('.chat-input').val("");

  });


// ==================
// READ FROM FIREBASE
// ==================

  function getMessagesFromFirebase() {
    database.ref('messages').limitToLast(10).on('child_added', function(childSnapshot) {
      console.log(childSnapshot.val());
      displayMessages(childSnapshot); // display 1 message 
    });

  }

//======================
// SEND/SAVE TO FIREBASE
//======================

  function storeMessageOnFirebase(messageObject) {
    database.ref('messages').push(messageObject);
  }


//======================
// BROWSER/DISPLAY
//======================
  
  function displayMessages(singleMessage) {
    var chatDiv = $('.chat-history');
    console.log('display messages');

    var singleMessage = singleMessage.val();
    
    var newName = $('<h4>');
    newName.html(singleMessage.name);
    newName.addClass('chat-message-name');
    chatDiv.append(newName);

    var newText = $('<p>');
    newText.html(singleMessage.text);
    newText.addClass('chat-message-text');
    chatDiv.append(newText);

  }




//=================
// INITIALIZE APP
//=================
function initializeApp() {
  appState = resetAppState();
  authorizationSetup();
  getMessagesFromFirebase(); 
}

initializeApp();


});

