const admin = require('firebase-admin');
var serviceAccount = require('../key/privateKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://employeefaq.firebaseio.com",
    storageBucket: "employeefaq.appspot.com",
  });
const db = admin.firestore();

module.exports = { admin, db };
