const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser')
const uuid = require('uuid')
const app = express();

app.use(bodyParser.json());



let users = [
  {
    id: 1,
    name: "John",
    favoriteMovies: []
  },
  {
    id: 2,
    name: "Maria",
    favoriteMovies: ["Chef"]
  }
]

let movies = [
  {
      "Title": "Chef",
      "Description": "After a controlling owner pushes him too far, chef Carl Casper quits his prestigious restaurant job and starts a food truck in an effort to reclaim his creative promise, while piecing back together his estranged family.",
      "Genre": {
          "Name": "Comedy",
          "Description": "Comedy is a genre of film in which the main emphasis is on humor. These films are designed to entertain and provoke laughter from the audience."
      },
      "Director": {
          "Name": "Jon Favreau",
          "Bio": "Jon Favreau, born on October 19, 1966, is an American actor, director, and producer. He is known for directing several Marvel movies including Iron Man and Iron Man 2. Favreau's work extends into independent films, as well as more personal projects like Chef (2014), where he wrote, directed, and starred.",
          "Birth": 1966.0,
      }
  },
  {
      "Title": "The Godfather",
      "Description": "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
      "Genre": {
          "Name": "Crime",
          "Description": "Crime films are centered on the actions of criminals or individuals caught up in criminal events. The genre often emphasizes the perspective of the criminal, the law, or the victims."
      },
      "Director": {
          "Name": "Francis Ford Coppola",
          "Bio": "Francis Ford Coppola, born on April 7, 1939, is an American film director, producer, and screenwriter. He is a pivotal figure in the New Hollywood wave of filmmaking and is best known for directing The Godfather trilogy and Apocalypse Now. His work is noted for its epic scope and emphasis on deep character development.",
          "Birth": 1939.0,
      }
  },
  {
      "Title": "The Avengers",
      "Description": "Earth's mightiest heroes must come together and learn to fight as a team if they are to stop the mischievous Loki and his alien army from enslaving humanity.",
      "Genre": {
          "Name": "Action",
          "Description": "Action films are characterized by a resourceful hero struggling against incredible odds, which include life-threatening situations, dangerous villains, or pursuing a quest, usually ending in victory."
      },
      "Director": {
          "Name": "Joss Whedon",
          "Bio": "Joss Whedon, born on June 23, 1964, is an American director, producer, and screenwriter. He is the creator of several TV series such as Buffy the Vampire Slayer and Firefly. Whedon is best known for his work in the superhero genre, particularly with Marvel's The Avengers and its sequel Avengers: Age of Ultron.",
          "Birth": 1964.0,
      }
  }
]


// CREATE USER
app.post('/users', (req, res) => {
  const newUser = req.body;

  if (newUser.name) {
    newUser.id = uuid.v4();
    users.push(newUser);
    res.status(201).json(newUser)
  } else {
    res.status(400).send('username missing')
  }

} )

// UPDATE USER
app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const updatedUser = req.body;
  
  let user = users.find( user => user.id == id );

  if (user) {
    user.name = updatedUser.name;
    res.status(200).json(user);
  } else {
    res.status(400).send('No user found')
  }
} )

// POST FAVMOVIE
app.post('/users/:id/:movieTitle', (req, res) => {
  const { id, movieTitle } = req.params;
  
  let user = users.find( user => user.id == id );

  if (user) {
    user.favoriteMovies.push(movieTitle);
    res.status(200).send(`${movieTitle} has been added to ${user.name}'s list`);
  } else {
    res.status(400).send('No user found')
  }
} )

// DELETE FAVMOVIE
app.delete('/users/:id/:movieTitle', (req, res) => {
  const { id, movieTitle } = req.params;
  
  let user = users.find( user => user.id == id );

  if (user) {
    user.favoriteMovies = user.favoriteMovies.filter( title => title !== movieTitle);
    res.status(200).send(`${movieTitle} has been removed from ${user.name}'s list`);
  } else {
    res.status(400).send('no user found')
  }
} )

// DELETE USER
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  
  let user = users.find( user => user.id == id );

  if (user) {
    users = users.filter( user => user.id != id);
    res.status(200).send(`User ${user.name} has been deleted.`);
  } else {
    res.status(400).send('No user found')
  }
} )


// READ MOVIES
app.get('/movies', (req, res) => {
  res.status(200).json(movies);
})

// READ TITLE
app.get('/movies/:title', (req, res) => {
  const { title } = req.params;
  const movie = movies.find( movie => movie.Title === title );

  if (movie) {
    res.status(200).json(movie);
  } else {
    res.status(400).send('Movie not found')
  }
})

// READ GENRE
app.get('/movies/genre/:genreName', (req, res) => {
  const { genreName } = req.params;
  const genre = movies.find( movie => movie.Genre.Name === genreName ).Genre;

  if (genre) {
    res.status(200).json(genre);
  } else {
    res.status(400).send('Genre not found')
  }
})

// READ DIRECTOR
app.get('/movies/directors/:directorName', (req, res) => {
  const { directorName } = req.params;
  const director = movies.find( movie => movie.Director.Name === directorName ).Director;

  if (director) {
    res.status(200).json(director);
  } else {
    res.status(400).send('Director not found')
  }
})




// log requests to console
app.use(morgan('common'));

// serve static files from /public
app.use(express.static('public'));
  
// endpoints
app.get('/', (req, res) => {
  res.send('Welcome to the myFlix API');
});


  

// error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
  
  
// listen for requests
app.listen(8080, () => {
  console.log('App is listening on port 8080.');
});