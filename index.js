const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/myflixdb', { useNewUrlParser: true, useUnifiedTopology: true });
const Models = require('./models.js');

const Movies = Models.Movie;
const Users = Models.User;

const express = require('express');
const morgan = require('morgan');
const uuid = require('uuid')
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Welcome to the myFlix API! Please see /documentation.html for more information.');
});

// GET USERS
app.get('/users', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// GET USER BY USERNAME
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// CREATE USER
app.post('/users', async (req, res) => {
  await Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + 'already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: req.body.Password,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          .then((user) =>{res.status(201).json(user) })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Error: ' + error);
        })
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

// UPDATE USER BY USERNAME
app.put('/users/:Username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.Username !== req.params.Username){ // username verification
    return res.status(400).send('Permission denied');
  }
  await Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      Password: req.body.Password,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
  { new: true })
  .then((updatedUser) => {
    res.json(updatedUser);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  })

});

// POST FAVMOVIE
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.Username !== req.params.Username){ // username verification
    return res.status(400).send('Permission denied');
  }
  await Users.findOneAndUpdate(
    { Username: req.params.Username },
    { $addToSet: { FavoriteMovies: req.params.MovieID } },
    { new: true, fields: {FavoriteMovies: 1} }
  )
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


// DELETE FAVMOVIE
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.Username !== req.params.Username){ // username verification
    return res.status(400).send('Permission denied');
  }
  await Users.findOneAndUpdate({ Username: req.params.Username }, {
     $pull: { FavoriteMovies: req.params.MovieID }
   },
   { new: true, fields: {FavoriteMovies: 1} })
  .then((updatedUser) => {
    res.json(updatedUser);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

// DELETE USER BY USERNAME
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.Username !== req.params.Username){ // username verification
    return res.status(400).send('Permission denied');
  }
  await Users.findOneAndDelete({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(404).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


// READ MOVIES
app.get('/movies', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// READ TITLE
app.get('/movies/:Title', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ Title: req.params.Title })
    .then((title) => {
      res.json(title);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// READ GENRE
app.get('/movies/genre/:Genre', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ 'Genre.Name': req.params.Genre })
  .select('Genre.Description')
    .then((movies) => {
      res.json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// READ DIRECTOR
app.get('/movies/directors/:Director', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ 'Director.Name': req.params.Director })
  .select('Director')
    .then((movies) => {
      res.json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// log requests to console
app.use(morgan('common'));

// error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
  
  
// listen for requests
app.listen(8080, () => {
  console.log('App is listening on port 8080.');
});