$(document).ready(function() {
   
//================
// FIREBASE SETUP
//================

// Initialize Firebase
var config = {
    apiKey: "AIzaSyB4pxKfx3ZqGDsKD3AcGsd2W62qoOYdXSQ",
    authDomain: "translation-chat-b2933.firebaseapp.com",
    databaseURL: "https://translation-chat-b2933.firebaseio.com",
    storageBucket: "translation-chat-b2933.appspot.com",
    messagingSenderId: "988353944532"
  };
firebase.initializeApp(config);

var database = firebase.database();
var provider = new firebase.auth.GoogleAuthProvider();
var auth = firebase.auth();

//================
// AUTHENTICATION
//================

var googleAuth = {
  /**
    * This function facilitates user sign-in via google auth provider
  */
  signInWithPopup: function() {
    firebase.auth().signInWithPopup(provider).then(function(result) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      // The signed-in user info.
      var user = result.user;
      // identify user by id & name throughout the app
      var name = user.displayName;
      var uid = user.uid; 
      var photoURL = user.photoURL
      // pass user info to database handling
      users.loginToDatabase(name, uid, photoURL);  
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
    });
  },

  /**
    * This function signs the current user out via google auth
  */
  signOut: function() {
    var currUserId = auth.currentUser.uid;
    users.logoutFromDatabase(currUserId); 
    firebase.auth().signOut().then(function() {
      // Sign-out successful.
    }).catch(function(error) {
      // An error happened.
    });
  }
};

//================
// USERS
//================

var users = {
  /**
    * This function uses firebase .update method to save user information (object) to the firebase database upon login
    * if existing user with a key matching the uid: updates name and sets status to online
    * if no existing key in database users matching that uid: adds new user with that uid and sets them to online  
    * @param {string} name - the user's display name
    * @param {string} uid - the user's ID 
  */
  loginToDatabase: function(name, uid, photoURL) {
    var updates = {
      name: name,
      photoURL: photoURL,
      online: true
    };
   database.ref('/users/' + uid).update(updates); 
  },

  /**
    * This function uses firebase .update method to set a user's status in the database to 'offline' so they don't appear in the user dropdown  
    * @param {string} uid - the current user's ID so the matching key can be found in the database and updated 
  */
  logoutFromDatabase: function(uid) {
    var updates = { 
      online: false 
    };
    database.ref('/users/' + uid).update(updates);
  },

  /**
    * this function gets the languages of the two users in the conversation, to be passed into the google translate API call 
    * TODO: find out who the second user in the conversation is and look up their lang
  */
  fetchRecipientLang: function(currUserId, currUserLang, currUserMessage) {
    // grab the current convo ID out of the current user's db snapshot 
    database.ref(`/users/${currUserId}/cId/`).once('value', function(snapshot) {
      let cId = snapshot.val();
      let recipientId;
      // grab snapshot of that conversation from the database
      database.ref(`/conversations/${cId}/`).once('value', function(snapshot) {
        let userOneId = snapshot.val().userOneId;
        let userTwoId = snapshot.val().userTwoId;
        // recipient is the user in the convo that DOESN'T match the current user
        if (userOneId === currUserId) {
          recipientId = userTwoId;
        } else if (userTwoId === currUserId) {
          recipientId = userOneId;
        }

        // get that user's langauge from their db snapshot
        let recipientLang;
        database.ref(`/users/${recipientId}/lang/`).once('value', function(snapshot) {
          recipientLang = snapshot.val();
          translation.translate(currUserLang, recipientLang, currUserMessage);
        });
      });
    });
  }
};


//================
// CONVERSATIONS
//================

var conversations = {
  /**
    * TODO: add logic to check if a conversation already exists 
      * between the current user and the second user (with recipientID)
    * if so, pull it up. if not, create a new one
  */

  fetchConversation: function(recipientId) {
    let currUserId = auth.currentUser.uid;
    database.ref('/conversations').once('value', function(snapshot) {
      let conversations = snapshot.val();
      let conversationFound = false;
      if(conversations !== null) {
        Object.keys(conversations).forEach(function(key, i) {
          let userOneId = conversations[key].userOneId;
          let userTwoId = conversations[key].userTwoId;
          if ((currUserId === userOneId && recipientId === userTwoId) ||
            (currUserId === userTwoId && recipientId === userOneId)) {
              database.ref('/users/' + currUserId).update({
                cId: key
              });
            conversationFound = true;
          } 
        });
      }
      if (!conversationFound) {
        conversations.createConversation(recipientId);
      }
    });
  },
  /**
    * this function establishes a new conversation between two users
    * @param {string} recipientId - the second user's uid (second user selected in dropdown)
  */
  createConversation: function(recipientId) {
    var cId; 
    // get current user's ID (user1)
    var currentUserId = auth.currentUser.uid; 

    // create a new conversation in the database's conversations node 
    database.ref('/conversations/').push({
      userOneId:currentUserId, 
      userTwoId:recipientId, 
      messages:{}
    }).once('value', function (snapshot){
      // get the key of the new conversation created by firebase and store it in var cId 
      cId = snapshot.key; 
    });
    // store that as current cId in user1/user2 in database
    database.ref('/users/' + currentUserId).update({
      cId: cId
    });
    // if (currentUserId || recipientId) {
    //   $(".users-list").hide(); 
    // }
  }
};

var langs = {
  fetchLangOptions: function() {
    let currUserId = auth.currentUser.uid; 
    // fetch user's language from database
    database.ref(`/users/${currUserId}/lang`).once('value', function(snapshot) {
      let currUserLang = snapshot.val();
      // If this is user's first time using application, we will default
      // to the language set in the browser
      if (!currUserLang) {
        currUserLang = navigator.language.substring(0,2);
        database.ref(`/users/${currUserId}`).update({
          lang: currUserLang
        });
      }
      display.displayCurrUserLang(currUserLang);
       
      // fetch languages supported by google translate api via a google
      // translate api request and add to list
      let queryURL = `https://translation.googleapis.com/language/translate/v2/languages?key=${translation.API_KEY}`;
      $.ajax({
        url: queryURL,
        method: "GET"
      }).done(function(res) { 
        let languages = res.data.languages;
        languages.forEach(function(language) {
          let lang = language.language;
          display.addLangToDropdown(lang);
        });
        $('select').material_select();
      });
    });
  }
};

// ==================
// READ FROM FIREBASE
// ==================

var firRead = {
  /**
    * This function uses on('child_added') listener to: 
    * get the last 10 messages in the current conversation from firebase and as new messages are added, refresh/get the most recent 10 messages
  */
  getMessagesFromFirebase: function() {
    let currUserId = auth.currentUser.uid;
    // on login, this function called, so adds listener that does work if cID changes? 
    database.ref(`/users/${currUserId}/cId/`).on('value', function(snapshot) {
      let cId = snapshot.val();
      database.ref(`/conversations/${cId}/messages`).off();
      database.ref(`/conversations/${cId}/messages`).limitToLast(10).on('child_added', function(childSnapshot) { // single message snapshot
        let isMessageSender = firRead.checkSenderRole(childSnapshot); 
        display.displayMessage(childSnapshot.val(), isMessageSender); // display 1 message 
      });
    });
  },

  /**
    * This function checks if auth.currentUser is the message's sender -- determines if original or translated is displayed to the user
    * @param {object} childSnapshot - the message snapshot from firebase (contains: sender, original, translated, timestamp)
  */
  checkSenderRole: function(childSnapshot) {
    return childSnapshot.val().sender === auth.currentUser.displayName;
  },

  /**
    * This function gets the users in the database users' node and listens for any future users added 
    * if the user is not the auth.currentUser and their status is 'online': calls display function to add user to dropdown of online users
  */
  getUsersFromFirebase: function() { 
    database.ref('/users').on('child_added', function (childSnapshot, childKey){
      if (childSnapshot.key !== auth.currentUser.uid) {
        display.displayUser(childSnapshot);
      }
    });
  }
};

//======================
// SEND/SAVE TO FIREBASE
//======================

firSend = {
  /**
    * This function stores a new message in the current conversation's messages node on Firebase. 
    * @param {object} messageObject - a single message object to add (keys: sender, original, translated, timestamp)
  */
  storeMessageOnFirebase: function(messageObject) {
    let currUserId = auth.currentUser.uid;
    let cId; 
    database.ref(`/users/${currUserId}/cId/`).once('value', function(snapshot) {
      cId = snapshot.val();
    });
    database.ref(`conversations/${cId}/messages`).push(messageObject);
  }
};

//==========================
// TRANSLATE API
//==========================
 
var translation = {
  // save API key for google translate API
  "API_KEY": 'AIzaSyD5phUVsdXQDXdnAQs2QJ9CpwiksKQS1WM',

  /**
    * This function makes the ajax request to the Google Translate API, and passes the translated text from the response to a function handleTranslateResponse
    * @param {string} source - the source language (current user's language) 
    * @param {string} target - the target language (the other user's language)
    * @param {string} originalText - the current user's input into the chat in their original language
  */
  translate: function(source = 'en', target = 'en', originalText) {
    display.revealTranslationProgressBar();
    let queryURL = `https://translation.googleapis.com/language/translate/v2?key=${translation.API_KEY}&q=${originalText}&source=${source}&target=${target}`;

    $.ajax({
      url: queryURL,
      method: "GET"
    }).done(function(res) { 
      translatedText = res.data.translations[0].translatedText;
      translation.handleTranslateResponse(translatedText, originalText);
      display.removeTranslationProgressBar();
    });
  },

  /**
    * This function creates an object with all of the message information to be pushed to databsae
    * @param {string} translatedText - the query translated into the target language
    * @param {string} originalText - the query in the native language 
  */
  handleTranslateResponse: function(translatedText, originalText) {
    var timestamp = moment().utc().format();
    var userName = auth.currentUser.displayName;
    var userPhoto = auth.currentUser.photoURL;
    var messageObject = {
      sender: userName,
      senderPhoto: userPhoto,
      original: originalText,
      translation: translatedText,
      timestamp: timestamp // TODO: use this in display
    };
    
    firSend.storeMessageOnFirebase(messageObject);
    // reset form input to show placeholder
    $('.chat-input').val("");
  } 
};

//==================
// EVENT MANAGEMENT
//==================

// create event handler for selecting languages. On language select,
// user's new language will be saved to database
$('.lang-select').on('change', function(res) {
  let newLang = $('.lang-option:selected').val();
  let currUserId = auth.currentUser.uid;
  database.ref(`/users/${currUserId}/`).update({
    lang: newLang
  });
});

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
    var email = user.email;
    $('.curr-user-name').html(userName);
    $('.curr-user-photo').html(`<img src=${profilePicUrl}></img>`);
    $('.curr-user-email').html(email);
    $('#sign-in-modal').modal('close');
    $('.chat-message').remove();
    $('.chat-user').remove();
    $('.sign-out').removeClass('hide');
    firRead.getUsersFromFirebase();
    firRead.getMessagesFromFirebase();
    langs.fetchLangOptions();
  } else {
    // No user is signed in.
    display.initializeSignInModal();
    // keep from duplicating the dynamically created dropdown elements when re-created on next sign-in
    $('select').material_select('destroy'); 
    $('.curr-user-name').html('');
    $('.curr-user-photo').html('');
    $('.sign-out').addClass('hide');
  }
});

/**
  * listener - upon user submitting a new chat via the form, checks if signed in
  * if so: gets user input and calls function to check user languages, upon a user submitting a new chat in the form
  * then calls the translate function and passes it those parameters 
  * TODO: if not signed in, display a message to the user 
*/
$('.chat-submit').on('click', function() {
  event.preventDefault();
  if (auth.currentUser) {
    var userInput = $('.chat-input').val().trim();
    let currUserId = auth.currentUser.uid;
    let userLang;
    database.ref(`/users/${currUserId}/lang`).once('value', function(snapshot) {
      userLang = snapshot.val();
    });
    users.fetchRecipientLang(currUserId, userLang, userInput);
  } 
});

/**
  * listeners - if the sign-in/out button is clicked, check if a user is signed in or not 
  * if so: call sign out and change the button text to 'sign in'
  * else: call sign in prompt (change button text to 'sign out' in that function once they've signed in)
*/
$('.sign-out').on('click', function() {
  if (auth.currentUser) { googleAuth.signOut(); }
});

$('.sign-in').on('click', function() {
  if (!auth.currentUser) { googleAuth.signInWithPopup(); }
});

/**
  * listener - if a user clicks a user name in the online-user's dropdown
  * get the data-uid value stored in the element's attributes (corresponds to the user)
  * pass it to startChat() 
*/
$(".users-list").on("click", ".chat-user", function () {
  var recipientId = $(this).attr("data-uid");
  // if some other chat user was selected:
  if($('.chat-user').hasClass('active')){
    $('.chat-user').removeClass('active');
    $('.chat-user').prop('disabled', false);
    $('.other-user-name').empty();
  }
  $(this).addClass('active'); //highlights current user in list
  $(this).prop('disabled', true);
  $('.other-user-name').html(' with ' + $(this).attr("data-name"));
  $(".chat-messages .chat-message").remove();
  conversations.fetchConversation(recipientId); 
});

//======================
// BROWSER/DISPLAY
//======================

var display = {
  initializeSignInModal: function() {
    $('#sign-in-modal').modal('open');
  },

  /**
    * This function display's an online user's name in the html dropdown of online users
    * @param {object} userSnapshot - snapshot from firebase user's listener (keys: name, id)
  */

  getUserStatus: function(userStatus) {
    if (userStatus) {
      return `
        <span class="new badge cyan lighten-3" data-badge-caption="online"></span>
      `;
    } else {
      return `
        <span class="new badge cyan lighten-4" data-badge-caption="offline"></span>
      `;
    }
  },

  displayUser: function(userSnapshot) {
      let userName = userSnapshot.val().name;
      let userID = userSnapshot.key; 
      let conversationID = userSnapshot.val().cId;
      let isUserOnline = userSnapshot.val().online;
      let userStatus = display.getUserStatus(userSnapshot.val().online);
      let numUnreadMessages = 5;
      let user = `
        <a class="chat-user collection-item" href="#"
          data-uid="${userID}" data-name="${userName}">
          ${userName}
          <span class="new badge red accent-2">
            ${numUnreadMessages}
          </span>
          ${userStatus}
        </a>
      `;
      $('.users-list').append(user); 
  },

  /**
    * This function appends a single message to the chat history displayed
    * @param {object} singleMessage - the message snapshot
    * @param {bool} isMessageSender - true if auth.currentUser is the sender of the message. used to determine if original or translation should be displayed from snapshot.
  */  
  displayMessage: function(messageObject, isMessageSender = true) {
    var chatMessages = $('.chat-messages-content');
    let messageText;
    let senderPhotoURL;
    let messageTimestamp = moment(messageObject.timestamp).format('MMM D, h:mm A');
    let senderName = messageObject.sender;

    // select original or translated dependng on sender
    if(isMessageSender) {
      messageText = messageObject.original;
    } else {
      messageText = messageObject.translation;
    }

    // sender photo if exists
    if (messageObject.senderPhoto) {
      senderPhotoURL = messageObject.senderPhoto;
    } else {
      senderPhotoURL = 'http://placehold.it/50x50/ff0000';
    }

    let newAvatarItem = $(`
      <li class="chat-message collection-item avatar">
        <img src=${senderPhotoURL} alt="sender_photo" class="circle">
        <span class="title grey-text">${senderName}</span>
        <p>${messageText}</p>
        <div class="chat-message-timestamp secondary-content purple-text text-darken-2">${messageTimestamp}</div>
      </li>
    `);

    chatMessages.append(newAvatarItem);
  },

  revealTranslationProgressBar: function() {
    var newProgressBar = $(`
      <div class="translation-progress">
        <label>Translating to recipient</label>
        <div class="progress">
          <div class="indeterminate purple"></div>
        </div>
      </div>
      `)
    $('.chat-messages').append(newProgressBar);
  },

  removeTranslationProgressBar: function() {
    $('.translation-progress').remove();
  },

  displayCurrUserLang: function(currUserLang) {
    // update lang-select to show user's current language and a list of 
    // languages supported by google translate
    $('.lang-select').append(`
      <option class="lang-option" value="${currUserLang}" active selected>
        ${currUserLang.toUpperCase()}
      </option>
    `);
  },

  addLangToDropdown: function(lang) {
    $('.lang-select').append(`
      <option class="lang-option" value="${lang}">
        ${lang.toUpperCase()}
      </option>
    `);
  }
};

//=================
// INITIALIZE APP
//=================
 
/*
function initializeApp() {
  appState = resetAppState();
}
*/

//initializeApp();
});