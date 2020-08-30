const { admin, db } = require("../utils/admin");

const config = require("../utils/config");
const { v4: uuidv4 } = require('uuid');
const firebase = require("firebase");
firebase.initializeApp(config);

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../utils/validator");


//sign up
exports.signup=(req,res)=>{
    console.log(req.body);
      const newUser={
          email:req.body.email,
          password:req.body.password,
          confirmPassword:req.body.confirmPassword,
          userName:req.body.userName
      };
  
      const { valid, errors } = validateSignupData(newUser);
      if (!valid) return res.status(400).json(errors);
      const noImg = "no-img.png";
      let token, userId;
      db.doc(`/users/${newUser.userName}`)
      .get()
      .then((doc)=>{
          if(doc.exists)
          {
              return res.status(400).json({ userName: "this User Name is already taken" });
          }
          else
          {
               return firebase
            .auth() 
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
          }
      })
      .then((data)=>{
          userId = data.user.uid;
          return data.user.getIdToken();
      })
      .then((idToken) => {
          token = idToken;
          const userCredentials = {
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userName:newUser.userName,
            //TODO Append token to imageUrl. Work around just add token from image in storage.
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
             userId,
          };
          return db.doc(`/users/${newUser.userName}`).set(userCredentials);
        })
        .then(() => {
          return res.status(201).json({ token });
        })
        .catch((err)=>
        {
          console.error(err);
          if (err.code === "auth/email-already-in-use") {
            return res.status(400).json({ email: "Email is already is use" });
          } else {
            return res
              .status(500)
              .json({ general: "Something went wrong, please try again" });
          }
        })
};

//login
exports.login=(req, res) => {
    console.log("Inside login",req.body);
    const user = {
      email: req.body.email,
      password: req.body.password,
    };
  
    const { valid, errors } = validateLoginData(user);
  
    if (!valid) return res.status(400).json(errors);
  
    firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password)
      .then((data) => {
        return data.user.getIdToken();
      })
      .then((token) => {
        return res.json({ token });
      })
      .catch((err) => {
        console.error(err);
        // auth/wrong-password
        // auth/user-not-user
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again" });
      });
}

// Upload a profile image for user
const {Storage} = require('@google-cloud/storage');
const storage = new Storage({
  projectId: config.projectId,
  keyFilename: "./key/privateKey.json"
});
const bucket = storage.bucket(config.storageBucket);

exports.uploadImage = (req, res) => {
  console.log('Upload Image');
  const path = require("path");
    const os = require("os");
    const fs = require("fs");
    let generatedToken = uuidv4();
    let imageToBeUploaded = {};
    const imageFile=req.file;
    console.log(imageFile)
    const imageExtension = imageFile.originalname.split(".")[imageFile.originalname.split(".").length - 1];
    let imageFileName = `${Math.round(
      Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
    let filepath=path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype:imageFile.mimetype };

    const uploadImageToStorage = () => {
      return new Promise((resolve, reject) => {
        if (!imageToBeUploaded) {
          reject('No image file');
        }    
        let fileUpload = bucket.file(imageFileName);
    
        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: imageFile.mimetype,
            firebaseStorageDownloadTokens:generatedToken
          }
        });
    
        blobStream.on('error', (error) => {
          reject('Something is wrong! Unable to upload at the moment.');
        });
    
        blobStream.on('finish', () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
          resolve(url);
        });
    
        blobStream.end(imageFile.buffer);
      });
    }

  if (imageFile) {
    var imageUrl;
    uploadImageToStorage()
    .then(() => {
      // Append token to url
      imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
      return db.doc(`/users/${req.user.userName}`).update({ imageUrl });
    })
    .then(() => {
      return res.json({ message: "image uploaded successfully",imageUrl });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "something went wrong" });
    });
  }
}

//Get authenticated user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.userName}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData = doc.data();
        return res.json(userData)
      }
      else {
        return res.status(404).json({ errror: "User not found" });
    }})
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//Remove user Profile photo
exports.removeImage=(req,res)=>{
  imageUrl = 'https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media';
  return db.doc(`/users/${req.user.userName}`).update({ imageUrl })
  .then(()=>{
    return res.json({ message: "image Removed successfully",imageUrl });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "something went wrong" });
    });
}

//Update User Profile info
exports.updateProfile=(req,res)=>{
  const profileData={
    fullName:req.body.fullName,
    email:req.body.email,
    phoneNumber:req.body.phoneNumber,
    location:req.body.location,
    bio:req.body.bio
  }
  db.doc(`/users/${req.user.userName}`).update(
    { 
      "fullName":profileData.fullName,
      "email":profileData.email, 
      "phoneNumber":profileData.phoneNumber,
      "location":profileData.location,
      "bio":profileData.bio
    })
  .then(()=>{
    return res.json({ message: "Profile Updated successfully"});
  }) 
  .catch((err) => {
    console.error(err);
    return res.status(500).json({ error: err.code });
  });

}