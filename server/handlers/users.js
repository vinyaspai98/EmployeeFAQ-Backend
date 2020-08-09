const { admin, db } = require("../utils/admin");

const config = require("../utils/config");
const { v4: uuidv4 } = require('uuid');
const firebase = require("firebase");
const firebaseSt = require("firebase/storage");
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
              return res.status(400).json({ handle: "this User Name is already taken" });
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
    console.log("Inside login");
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
exports.uploadImage = (req, res) => {
  var BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  console.log(req);
  var busboy = new BusBoy({ headers: req.headers });
  let imageToBeUploaded = {};
  let filepath;
  let imageFileName;
  // String for image token
  let generatedToken = uuidv4();
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    console.log("Inside busboy");
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png" && mimetype !== "image/jpg") 
    {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;

    filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    console.log("IMAGE:",imageToBeUploaded);
    file.pipe(fs.createWriteStream(filepath));
  });

  console.log(imageToBeUploaded);
  busboy.on("finish", () => {
    console.log("Inside busboy finish");
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        // Append token to url
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        return db.doc(`/users/${req.user.userName}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "image uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};
