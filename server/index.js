const app = require('express')()
var bodyParser = require('body-parser')
const cors = require('cors');
app.use(cors());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

const {
    signup,
    login,
    uploadImage
  } = require('./handlers/users');

const{
    getQuestions,
    askQuestion,
    fetchQuestion,
    deleteQuestion,
    commentOnQuestion
}= require('./handlers/questions');

const fbAuth = require('./utils/fbAuth')

app.post('/signup',signup);
app.post('/login',login);
app.post('/user/image',fbAuth,uploadImage);

app.get('/questions',getQuestions);
app.post('/askquestion',fbAuth,askQuestion);
app.get('/question/:questionId',fetchQuestion);
app.delete('/question/:questionId', fbAuth, deleteQuestion);
app.post('/question/:questionId/comment', fbAuth, commentOnQuestion);

//start server
app.listen(5000,()=>{
  console.log("Server is running in 5000");
})
.on('error',console.log);
