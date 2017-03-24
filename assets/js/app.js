//================
// API SETUP
//================
  // save API key for google translate API
  const API_KEY = 'AIzaSyD5phUVsdXQDXdnAQs2QJ9CpwiksKQS1WM';

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

  /**
    * This function facilitates user sign-in via their google account. 
  */
  function googleSignInPopup() {
    firebase.auth().signInWithPopup(provider).then(function(result) {
      // update button text
      $('.sign-out').html('Sign Out');
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      // The signed-in user info.
      var user = result.user;
      // identify user by id & name throughout the app
      var name = user.displayName;
      var uid = user.uid; 
      var photoURL = user.photoURL
      
      logInUserInDatabase(name, uid, photoURL); 
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
    });
  }

  /**
    * This function signs the current user out of their google account
  */
  function googleSignOut() {
    var userId = auth.currentUser.uid;
    logOutUserInDatabase (userId); 
    firebase.auth().signOut().then(function() {
      // Sign-out successful.
    }).catch(function(error) {
      // An error happened.
    });
  }

  /**
    * This function checks if the user is signed in (if there is a current user). 
    * returns true if signed in
  */
  function checkSignedIn(){
    if(auth.currentUser)  {
      return true;
    } else {
      //TODO
    }
  }

  /**
    * listener for a user's sign-in state
    * used to persist user's login information on the page even when page refreshed 
    * @param {object} user - a snapshot of the auth current user. 
  */
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // if signed in: display user info  
      var userName = user.displayName;
      var profilePicUrl = user.photoURL;
      $('.curr-user-name').html(userName);
      $('.curr-user-photo').html(`<img src=${profilePicUrl}></img>`);

      $('.sign-out').removeClass('hidden')
      $('.curr-user-status').html('Sign Out');
      $('#sign-in-modal').modal('close');

      $('.chat-message').remove();
      $('.chat-user').remove();
      getMessagesFromFirebase();
      getUsersFromFirebase();
    } else {
      // No user is signed in.
      // console.log('no user');
      initializeSignInModal();
      $('.curr-user-name').html('');
      $('.curr-user-photo').html('');
      // $('.curr-user-status').html('Sign In');
      //$('.sign-out').addClass('hidden');
    }
  });

  function initializeSignInModal() {
    $('#sign-in-modal').modal('open');
    //var signInModal = $('#sign-in-modal');
    //signInModal.modal('open');
    //signIn.modal({'show': true, 'backdrop': 'static'}); // static: user can't click background to close modal
  }

  /**
    * This function uses firebase .update method to save user information (object) to the firebase database upon login
    * if existing user with a key matching the uid: updates name and sets status to online
    * if no existing key in database users matching that uid: adds new user with that uid and sets them to online  
    * @param {string} name - the user's display name
    * @param {string} uid - the user's ID 
  */
  function logInUserInDatabase (name, uid, photoURL) {
    var updates = {
      name: name,
      photoURL: photoURL,
      online: true
    };

   database.ref('/users/' + uid).update(updates); 
  }

  /**
    * This function uses firebase .update method to set a user's status in the database to 'offline' so they don't appear in the user dropdown  
    * @param {string} uid - the current user's ID so the matching key can be found in the database and updated 
  */
  function logOutUserInDatabase (uid) {
    var updates = {
      online: false
    };

    database.ref('/users/' + uid).update(updates);
  }


//===========
// APP STATE
//=========== 

  /**
    * app state would used more as app is built out further -- for now, most of the state changes are linked to firebase auth state 
  */
  let appState; 
  function resetAppState() {
    return {
      cId: ''
    };
  }


//===================
// EVENT MANAGEMENT
//==================

  /**
    * this function gets the languages of the two users in the conversation, to be passed into the google translate API call 
    * TODO: find out who the second user in the conversation is and look up their lang
  */

  function fetchChatUserLang(currUserId, userLang, userInput) {
    database.ref(`/users/${currUserId}/cId/`).once('value', function(snapshot) {
      let cId = snapshot.val();
      let chatUserId;
      database.ref(`/conversations/${cId}/`).once('value', function(snapshot) {
        let userOneId = snapshot.val().userOneId;
        let userTwoId = snapshot.val().userTwoId;

        if (userOneId === currUserId) {
          chatUserId = userTwoId;
        } else if (userTwoId === currUserId) {
          chatUserId = userOneId;
        }
        let chatUserLang;
        database.ref(`/users/${chatUserId}/lang/`).once('value', function(snapshot) {
          chatUserLang = snapshot.val();
          console.log(chatUserLang);
          translate(userLang, chatUserLang, userInput);
        });
      });
    });
  }

  /**
    * listener - upon user submitting a new chat via the form, checks if signed in
    * if so: gets user input and calls function to check user languages, upon a user submitting a new chat in the form
    * then calls the translate function and passes it those parameters 
    * TODO: if not signed in, display a message to the user 
  */
  $('.chat-submit').on('click', function() {
    event.preventDefault();
    if(checkSignedIn()){
      var userInput = $('.chat-input').val().trim();
      let currUserId = auth.currentUser.uid;
      let userLang;
      database.ref(`/users/${currUserId}/lang`).once('value', function(snapshot) {
        userLang = snapshot.val();
      });
      fetchChatUserLang(currUserId, userLang, userInput);

    } else {
      //TODO
      console.log('error not signed in');
    }

  });

  /**
    * listeners - if the sign-in/out button is clicked, check if a user is signed in or not 
    * if so: call sign out and change the button text to 'sign in'
    * else: call sign in prompt (change button text to 'sign out' in that function once they've signed in)
  */
  $(document).on('click', '.sign-out', function() {
    
    if(checkSignedIn()){
      googleSignOut();
     // $('.sign-out').addClass('hidden');
    }
  });

  $(document).on('click', '.sign-in', function() {
    if(!checkSignedIn()){
      googleSignInPopup();
    }
  })

  /**
    * listener - if a user clicks a user name in the online-user's dropdown
    * get the data-uid value stored in the element's attributes (corresponds to the user)
    * pass it to startChat() 
  */
  $(".users-list").on("click", ".chat-user", function () {
    var chatUserId = $(this).attr("data-uid");
    $(".chat-messages .chat-message").remove();
    fetchConversation(chatUserId); 
  });

// ==================
// READ FROM FIREBASE
// ==================

  /**
    * This function uses on('child_added') listener to: 
    * get the last 10 messages in the current conversation from firebase and as new messages are added, refresh/get the most recent 10 messages
  */
  function getMessagesFromFirebase() {
    let currUserId = auth.currentUser.uid;
    database.ref(`/users/${currUserId}/cId/`).on('value', function(snapshot) {
      let cId = snapshot.val();
      database.ref(`/conversations/${cId}/messages`).off();
      database.ref(`/conversations/${cId}/messages`).limitToLast(10).on('child_added', function(childSnapshot) { // single message snapshot
        let isMessageSender = checkSenderRole(childSnapshot); 
        displayMessage(childSnapshot, isMessageSender); // display 1 message 
      });
    });
  }

  /**
    * This function checks if auth.currentUser is the message's sender -- determines if original or translated is displayed to the user
    * @param {object} childSnapshot - the message snapshot from firebase (contains: sender, original, translated, timestamp)
  */
  function checkSenderRole(childSnapshot) {
    return childSnapshot.val().sender === auth.currentUser.displayName;
  }

  /**
    * This function gets the users in the database users' node and listens for any future users added 
    * if the user is not the auth.currentUser and their status is 'online': calls display function to add user to dropdown of online users
  */
  function getUsersFromFirebase () { 
    database.ref('/users').on('child_added', function (childSnapshot, childKey){
      if (childSnapshot.key !== auth.currentUser.uid) {
        displayUser(childSnapshot);
      }
    });
  }

  /**
    * This function uses on("child_changed") listener to check when any user's on/offline status changes. Calls function to add or remove from online-users dropdown. 
  */


//======================
// SEND/SAVE TO FIREBASE
//======================

  /**
    * This function stores a new message in the current conversation's messages node on Firebase. 
    * @param {object} messageObject - a single message object to add (keys: sender, original, translated, timestamp)
  */
  function storeMessageOnFirebase(messageObject) {
    let currUserId = auth.currentUser.uid;
    let cId; 
    database.ref(`/users/${currUserId}/cId/`).once('value', function(snapshot) {
      cId = snapshot.val();
    });
    database.ref(`conversations/${cId}/messages`).push(messageObject);
  }

  
//================
// CONVERSATIONS
//================

  /**
    * TODO: add logic to check if a conversation already exists 
      * between the current user and the second user (with chatUserID)
    * if so, pull it up. if not, create a new one
  */

  function fetchConversation(chatUserId) {
    let currUserId = auth.currentUser.uid;

    database.ref('/conversations').once('value', function(snapshot) {
      let conversations = snapshot.val();
      let conversationFound = false;
      Object.keys(conversations).forEach(function(key, i) {
        let userOneId = conversations[key].userOneId;
        let userTwoId = conversations[key].userTwoId;
        if ((currUserId === userOneId && chatUserId === userTwoId) ||
          (currUserId === userTwoId && chatUserId === userOneId)) {
            database.ref('/users/' + currUserId).update({
              cId: key
            });
          conversationFound = true;
        } 
      });
      if (!conversationFound) {
        createConversation(chatUserId);
      }
    });
  }
  /**
    * this function establishes a new conversation between two users
    * @param {string} chatUserId - the second user's uid (second user selected in dropdown)
  */
  function createConversation(chatUserId) {
    var cId; 
    // get current user's ID (user1)
    var currentUserId = auth.currentUser.uid; 

    // create a new conversation in the database's conversations node 
    database.ref('/conversations/').push({
      userOneId:currentUserId, 
      userTwoId:chatUserId, 
      messages:{}
    }).once('value', function (snapshot){
      // get the key of the new conversation created by firebase and store it in var cId 
      cId = snapshot.key; 
    });
    // store that as current cId in user1/user2 in database
    database.ref('/users/' + currentUserId).update({
      cId: cId
    });
    // if (currentUserId || chatUserId) {
    //   $(".users-list").hide(); 
    // }
  }

//======================
// BROWSER/DISPLAY
//======================

  /**
    * This function display's an online user's name in the html dropdown of online users
    * @param {object} userSnapshot - snapshot from firebase user's listener (keys: name, id)
  */
  function displayUser (userSnapshot) {
      let userName = userSnapshot.val().name;
      let userID = userSnapshot.key; 
      let conversationID = userSnapshot.val().cId;
      let numUnreadMessages = 5;
      let user = `
        <a class="chat-user collection-item" href="#"
          data-uid="${userID}">
          ${userName}
          <span class="new badge">
            ${numUnreadMessages}
          </span>
        </a>
      `;
      $('.users-list').append(user); 
  }

  /**
    * This function removes an now-offline user from the html dropdown of online users
    * @param {object} userSnapshot - snapshot from firebase user's listener (keys: name, id)
  */
  function removeUser (userSnapshot) {
    var uid = userSnapshot.key; 
    $("[data-uid=" + uid + "]").remove();

  }
  
  /**
    * This function appends a single message to the chat history displayed
    * @param {object} singleMessage - the message snapshot
    * @param {bool} isMessageSender - true if auth.currentUser is the sender of the message. used to determine if original or translation should be displayed from snapshot.
  */  
  function displayMessage(singleMessage, isMessageSender = true) {

    var chatMessages = $('.chat-messages');

    var chatMessageContent = singleMessage.val();
    
    let messageText;
    if (isMessageSender) {
      messageText = chatMessageContent.original;
    } else {
      messageText = chatMessageContent.translation;
    }

    let senderPhotoURL;
    if (chatMessageContent.senderPhoto) {
      senderPhotoURL = chatMessageContent.senderPhoto;
    } else {
      senderPhotoURL = 'http://placehold.it/50x50/ff0000';
    }

    let messageTimestamp = moment(chatMessageContent.timestamp).format('MMM D, h:mm A');

    let chatMessage = `
      <li class="chat-message collection-item">
        <div class="chat-message-body chip">
          <img src=${senderPhotoURL}>
          ${messageText}
        </div>
        <div class="chat-message-timestamp chip">
          ${messageTimestamp}
        </div>

    `;
    chatMessages.append(chatMessage);
  }

//==========================
// TRANSLATE API
//==========================

  /**
    * This function makes the ajax request to the Google Translate API, and passes the translated text from the response to a function handleTranslateResponse
    * @param {string} source - the source language (current user's language) 
    * @param {string} target - the target language (the other user's language)
    * @param {string} originalText - the current user's input into the chat in their original language
  */
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

  /**
    * This function creates an object with all of the message information to be pushed to databsae
    * @param {string} translatedText - the query translated into the target language
    * @param {string} originalText - the query in the native language 
  */
  function handleTranslateResponse(translatedText, originalText) {
    var timestamp = moment().utc().format();
    console.log(timestamp);
    var userName = auth.currentUser.displayName;
    var userPhoto = auth.currentUser.photoURL;
    var messageObject = {
      sender: userName,
      senderPhoto: userPhoto,
      original: originalText,
      translation: translatedText,
      timestamp: timestamp // TODO: use this in display
    };
    
    storeMessageOnFirebase(messageObject);
    // reset form input to show placeholder
    $('.chat-input').val("");
  }

//=======================
// INITIALIZE MATERIALIZE
//=======================

// moved this to index.html before app.js script. else it wasn't done initializing before materialize things used in app.js, so essentially modal wouldn't show up on page load because it wasn't finished with initializing. 

// function initializeMaterialize() {
//   $('select').material_select();
//   $('.modal').modal({dismissible:false});
// }
//=================
// INITIALIZE APP
//=================
function initializeApp() {
  // initializeMaterialize();
  appState = resetAppState();
  // getMessagesFromFirebase(); 
  // getUsersFromFirebase(); 
  // watchUsersFromFirebase();
}

$(document).ready(function() {
  initializeApp();
});

