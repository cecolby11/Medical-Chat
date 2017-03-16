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
  userInput: null,
  emergencyLevel: null

};

//===================
// EVENT MANAGEMENT
//==================

$('.chat-submit').on('click', function() {
  event.preventDefault();
  appState.userInput = $('.chat-input').val().trim();
  // Fix this: 
  appState.emergencyLevel = $('.chat-emergency-level').val();

  console.log(userInput);
  console.log(emergencyLevel);


// ==================
// READ FROM FIREBASE
// ==================

function getMessagesFromFirebase() {
  database.ref().limitToLast(10).on('child_added', function(childSnapshot) {
    console.log(childSnapshot);
  }

}

//======================
// SEND/SAVE TO FIREBASE
//======================

function storeMessageOnFirebase() {


}


});






});