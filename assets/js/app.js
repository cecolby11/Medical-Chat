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
  var provider = new firebase.auth.GoogleAuthProvider();
  var auth = firebase.auth();
  var storage = firebase.storage();

  function googleSignInPopup() {
    firebase.auth().signInWithPopup(provider).then(function(result) {
      $('.sign-in').html('Sign Out');
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      // The signed-in user info.
      var user = result.user;
      // ...
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
      // ...
    });
  }

  function googleSignOut() {
    firebase.auth().signOut().then(function() {
      // Sign-out successful.
    }).catch(function(error) {
      // An error happened.
    });
  }

  function checkSignedIn(){
    if(auth.currentUser)  {
      return true;
    } else {
      //TODO
    }
  }

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      
    } else {
      // No user is signed in.
      console.log('no user');
    }
  });

//===========
// APP STATE
//=========== 

var appState;
function resetAppState() {
  return {
    phase: 'initialize'
  }
}


//===================
// EVENT MANAGEMENT
//==================

  $('.chat-submit').on('click', function() {
    event.preventDefault();
    if(checkSignedIn()){

      var userInput = $('.chat-input').val().trim();
      // Fix this: 
      var emergencyLevel = $('.chat-emergency-level').val();
      var timestamp = moment().format();
      var userName = auth.currentUser.displayName;
      var messageObject = {
        text: userInput,
        name: userName,
        timestamp: timestamp
      };
      
      storeMessageOnFirebase(messageObject);
      // reset form input to show placeholder
      $('.chat-input').val("");
    } else {
      console.log('error not signed in');
    }

  });

  $('.sign-in').on('click', function() {
    if(checkSignedIn()){
      googleSignOut();
      $('.sign-in').html('Sign In');
    } else {
      googleSignInPopup();
    }
  });



// ==================
// READ FROM FIREBASE
// ==================

  function getMessagesFromFirebase() {
    database.ref('messages').limitToLast(10).on('child_added', function(childSnapshot) {
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
  getMessagesFromFirebase(); 
}

initializeApp();


});

