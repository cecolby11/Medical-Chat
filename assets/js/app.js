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

  // save API key for translate API
  const API_KEY = 'AIzaSyD5phUVsdXQDXdnAQs2QJ9CpwiksKQS1WM';

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
      let userLang = '';
      let target = '';
       
      database.ref('/users').on('child_added', function(snapshot) {
        console.log('this works.');
        if (auth.currentUser.displayName === snapshot.val().name) {
          userLang = snapshot.val().lang;
          console.log(userLang);
        }
        if ('Casey Colby' === snapshot.val().name) {
          target = snapshot.val().lang;
          console.log(target);
        }
      });
       
      console.log(translate('en', 'de', userInput));
      console.log(translation);

      // Fix this: 
      var emergencyLevel = $('.chat-emergency-level').val();
      var timestamp = moment().format();
      var userName = auth.currentUser.displayName;
      var messageObject = {
        sender: userName,
        original: userInput,
        translation: '',
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
  // hardcode cid
  let cid = "c1";

  function getMessagesFromFirebase() {
    database.ref(`conversations/${cid}/messages`).limitToLast(10).on('child_added', function(childSnapshot) {
      let isMessageSender = checkSenderRole(childSnapshot);
      displayMessage(childSnapshot, isMessageSender); // display 1 message 
    });

  }

  function checkSenderRole(childSnapshot) {
    return childSnapshot.val().sender === auth.currentUser.displayName;
  }

//======================
// SEND/SAVE TO FIREBASE
//======================

  function storeMessageOnFirebase(messageObject) {
    database.ref(`conversations/${cid}/messages`).push(messageObject);
  }


//======================
// BROWSER/DISPLAY
//======================
  
  function displayMessage(singleMessage, isMessageSender = true) {

    var chatDiv = $('.chat-history');

    var singleMessage = singleMessage.val();
    
    var sender = $('<h4>');
    sender.html(singleMessage.sender);
    sender.addClass('chat-message-name');
    chatDiv.append(sender);

    var newText = $('<p>');
    if (isMessageSender) {
      newText.html(singleMessage.original);
    } else {
      newText.html(singleMessage.translation);
    }
    newText.addClass('chat-message-text');
    chatDiv.append(newText);
  }

//==========================
// TRANSLATE API
//==========================

let translation;
function translate(source = 'en', target = 'en', message) {
  let queryURL = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}&q=${message}&source=${source}&target=${target}`;

  let translatedText;
  $.ajax({
    url: queryURL,
    method: "GET"
  }).done(function(res) { 
    translatedText = res.data.translations[0].translatedText;
    translation = translatedText;
    console.log(translation);
  });
}

function handleTranslateResponse(translatedText) {
  console.log(translatedText);
  return translatedText;
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

