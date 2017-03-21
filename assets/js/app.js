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
      var name = user.displayName;
      var uid = user.uid; 
    
      logInUserInDatabase(name, uid); 

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
    var userId = auth.currentUser.uid;
    logOutUserInDatabase (userId); 

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

  function logInUserInDatabase (name, uid) {
    var updates = {
      name: name,
      uid: uid,
      online: true
    };


   database.ref('/users/' + uid).update(updates); 
  }

  function logOutUserInDatabase (uid) {
    var updates = {
      online: false

    };
    console.log(uid);

    database.ref('/users/' + uid).update(updates); 

  }
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


  function gatherLangs() {
    database.ref('/users').on('child_added', function(snapshot) {
      if (auth.currentUser.displayName === snapshot.val().name) {
        userLang = snapshot.val().lang;
      }
      if ('Casey Colby' === snapshot.val().name) {
        target = snapshot.val().lang;
      }
    });
  }

  $('.chat-submit').on('click', function() {
    event.preventDefault();
    if(checkSignedIn()){
      var userInput = $('.chat-input').val().trim();
      let userLang = '';
      let target = '';
      gatherLangs();
      target = 'de';

      translate(userLang, target, userInput);
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

  function getUsersFromFirebase () {
    database.ref('/users').on('child_added', function (childSnapshot){
      if (childSnapshot.val().online === true && childSnapshot.val().uid !== auth.currentUser.uid) {
        displayUser(childSnapshot);

      }
      

    });

  }

  function watchUsersFromFirebase () {
    database.ref('/users').on("child_changed", function (childSnapshot){
      if (childSnapshot.val().online === true ) {

        displayUser(childSnapshot); 
      } else if (childSnapshot.val().online === false) {
        removeUser(childSnapshot); 
      }

    });
  }


  function removeUser (userSnapshot) {
    var uid = userSnapshot.val().uid; 
    $("[data-uid=" + uid + "]").remove();

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

function displayUser (userSnapshot) {
    console.log(userSnapshot.val());
    var listItem = $("<li>");
    listItem.html(userSnapshot.val().name);
    listItem.attr("data-uid", userSnapshot.val().uid); 
    $('.users-list').append(listItem); 
}
  
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

function translate(source = 'en', target = 'en', originalText) {
  let queryURL = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}&q=${originalText}&source=${source}&target=${target}`;

  $.ajax({
    url: queryURL,
    method: "GET"
  }).done(function(res) { 
    translatedText = res.data.translations[0].translatedText;
    handleTranslateResponse(translatedText, originalText);
  });
}

function handleTranslateResponse(translatedText, originalText) {
  var emergencyLevel = $('.chat-emergency-level').val();
  var timestamp = moment().format();
  var userName = auth.currentUser.displayName;
  var messageObject = {
    sender: userName,
    original: originalText,
    translation: translatedText,
    timestamp: timestamp
  };
  
  storeMessageOnFirebase(messageObject);
  // reset form input to show placeholder
  $('.chat-input').val("");
}

//=================
// INITIALIZE APP
//=================
function initializeApp() {
  appState = resetAppState();
  getMessagesFromFirebase(); 
  getUsersFromFirebase(); 
  watchUsersFromFirebase();
}

initializeApp();

});

