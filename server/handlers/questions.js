const { db } = require('../utils/admin');

//get questions
exports.getQuestions=(req,res)=>{
    db.collection('questions')
      .orderBy('postedAt', 'desc')
      .get()
      .then((data) => {
        let questions = [];
        data.forEach((doc) => {
          questions.push({
            questionId: doc.id,
            question: doc.data().question,
            userName: doc.data().userName,
            postedAt: doc.data().postedAt,
            commentCount: doc.data().commentCount,
            likeCount: doc.data().likeCount,
          });
        });
        return res.json(questions);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
};

//post question
exports.askQuestion=(req,res)=>{
    if (req.body.question.trim() === '') {
      return res.status(400).json({ body: 'question must not be empty' });
    }
  
    const newquestion={
      userName: req.body.userName,
      title:req.body.title,
      question:req.body.question,
      postedAt: new Date().toISOString(),
      likeCount:0,
      commentCount:0
    };
  
    db.collection('questions')
      .add(newquestion)
      .then((doc) => {
        const resQuestion = newquestion;
        resQuestion.questionId = doc.id;
        res.json(resQuestion);
      })
      .catch((err) => {
        res.status(500).json({ error: 'something went wrong' });
        console.error(err);
      });
};

//fetch one Question
exports.fetchQuestion=(req, res) => {
    let questionData = {};
    console.log("Inside Fetch question");
    db.doc(`/questions/${req.params.questionId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Question not found' });
        }
        questionData = doc.data();
        questionData.questionId = doc.id;
        return db
          .collection('comments')
          .orderBy('postedAt', 'desc')
          .where('questionId', '==', req.params.questionId)
          .get();
      })
      .then((data) => {
        questionData.comments = [];
        data.forEach((doc) => {
          questionData.comments.push(doc.data());
        });
        return res.json(questionData);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
};

//delete a question

exports.deleteQuestion=(req,res)=>{
  console.log("Inside delete",req.params);
  const document = db.doc(`/questions/${req.params.questionId}`);
  document.
  get()
  .then((doc)=>{
    if(!doc.exists)
    {
      res.status(404).json({error:"Question not found"});
    }
    if (doc.data().userName !== req.user.userName) {
      return res.status(403).json({ error: 'Unauthorized' });
    } else {
      return document.delete();
    }
  })
  .then(()=>{
    res.json({ message: 'Question deleted successfully' });
  })
  .catch((err)=>{
    console.error(err);
    return res.status(500).json({ error: err.code });
  })
}

//Comment on question
exports.commentOnQuestion=(req,res)=>{
  if (req.body.body.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' });

  const newComment = {
    body: req.body.body,
    postedAt: new Date().toISOString(),
    questionId: req.params.questionId,
    userName: req.user.userName,
    userImage: req.user.imageUrl
  };
  console.log(newComment);

  db.doc(`/questions/${req.params.questionId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Question not found' });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong' });
    });
}