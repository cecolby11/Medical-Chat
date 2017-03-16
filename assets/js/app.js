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

//===========
// APP STATE
//=========== 

  var appState = {
    phase: "initialize",
    userName: "Caryn"

  };

//===================
// EVENT MANAGEMENT
//==================

  $('.chat-submit').on('click', function() {
    event.preventDefault();
    var userInput = $('.chat-input').val().trim();
    // Fix this: 
    var emergencyLevel = $('.chat-emergency-level').val();
    var messageObject = {
      text: userInput,
      name: appState.userName
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




//=======================

  getMessagesFromFirebase();


});

