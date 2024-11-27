/**
 * @file index.js
 * @description Main entry point for the MovieBase API server. Sets up routes, middleware, and configurations.
 */

const mongoose = require("mongoose");
mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const Models = require("./models.js");

const Movies = Models.Movie;
const Users = Models.User;

const express = require("express");
const morgan = require("morgan");
const uuid = require("uuid");
const app = express();
const { check, validationResult } = require("express-validator");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * @constant {function} cors
 * @description Configures the CORS policy for the application.
 */
const cors = require("cors");
let allowedOrigins = [
  "http://localhost:1234",
  "http://localhost:4200",
  "https://projectmoviebase.netlify.app",
  "https://elodloic.github.io",
  "http://movie-base-client.s3-website.eu-central-1.amazonaws.com/",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        // If a specific origin isn’t found on the list of allowed origins
        let message =
          "The CORS policy for this application doesn’t allow access from origin " +
          origin;
        return callback(new Error(message), false);
      }
      return callback(null, true);
    },
  })
);

let auth = require("./auth")(app);
const passport = require("passport");
require("./passport");
app.use(express.static("public"));

/**
 * @name Root endpoint
 * @description Displays welcome message with a link to documentation.
 * @route {GET} /
 */
app.get("/", (req, res) => {
  res.send(
    "Welcome to the MovieBase API! Please see /documentation.html for more information."
  );
});

/**
 * @route {GET} /users/:Username
 * @name Get user data
 * @routeparam {string} :Username - The username of the user
 * @description Returns user data as a JSON object if found, otherwise an error message.
 * @authentication JWT authentication required
 */
app.get(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username !== req.params.Username) {
      // username verification
      return res.status(400).send("Permission denied");
    }
    await Users.findOne({ Username: req.params.Username })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * @route {POST} /users
 * @name Create a new user
 * @bodyparam {string} Username - The username of the new user (must be at least 5 characters)
 * @bodyparam {string} Password - The password of the new user
 * @bodyparam {string} Email - The email of the new user
 * @bodyparam {date} Birthday - The birthday of the new user
 * @description Returns a JSON object with the username and the user's ID or an error message.
 */
app.post(
  "/users",
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  async (req, res) => {
    // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username }) // Checking DB if the requested username already exists
      .then((user) => {
        if (user) {
          // Return error if matching username found
          return res.status(400).send(req.body.Username + " already exists");
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          })
            .then((user) => {
              res.status(201).json(user);
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send("Error: " + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);

/**
 * @route {PUT} /users/:Username
 * @name Update user data
 * @routeparam {string} :Username - The username of the user to update
 * @bodyparam {string} [Username] - The new username for the user
 * @bodyparam {string} [Password] - The new password for the user
 * @bodyparam {string} [Email] - The new email for the user
 * @bodyparam {date} [Birthday] - The new birthday for the user
 * @description Returns a JSON object with the updated username, the user's ID and their list of favorite movies.
 * @authentication JWT authentication required
 */ app.put(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  async (req, res) => {
    // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);

    if (req.user.Username !== req.params.Username) {
      // username verification
      return res.status(400).send("Permission denied");
    }

    try {
      // Check if the new username already exists in the database
      const existingUser = await Users.findOne({ Username: req.body.Username });

      // If the new username exists and it does not belong to the current user, return an error
      if (existingUser && existingUser.Username !== req.params.Username) {
        return res
          .status(400)
          .send('The username "' + req.body.Username + '" is already taken.');
      }

      // Update the user if the username is unique or remains unchanged
      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.Username }, // Find user by current username
        {
          $set: {
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          },
        },
        { new: true }
      );

      res.json(updatedUser);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error: " + err);
    }
  }
);

/**
 * @route {POST} /users/:Username/movies/:MovieID
 * @name Add movie to favorites
 * @routeparam {string} :Username - The username of the user
 * @routeparam {string} :MovieID - The ID of the movie
 * @description Returns a JSON object with the user's ID and their favorite movies list
 * @authentication JWT authentication required
 */
app.post(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username !== req.params.Username) {
      // username verification
      return res.status(400).send("Permission denied");
    }
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      { $addToSet: { FavoriteMovies: req.params.MovieID } },
      { new: true, fields: { FavoriteMovies: 1 } }
    )
      .then((updatedUser) => {
        res.json(updatedUser);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * @route {DELETE} /users/:Username/movies/:MovieID
 * @name Remove movie from favorites
 * @routeparam {string} :Username - The username of the user
 * @routeparam {string} :MovieID - The ID of the movie
 * @description Returns a JSON object with the user's ID and their favorite movies list
 * @authentication JWT authentication required
 */
app.delete(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username !== req.params.Username) {
      // username verification
      return res.status(400).send("Permission denied");
    }
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $pull: { FavoriteMovies: req.params.MovieID },
      },
      { new: true, fields: { FavoriteMovies: 1 } }
    )
      .then((updatedUser) => {
        res.json(updatedUser);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * @route {DELETE} /users/:Username
 * @name Remove user
 * @routeparam {string} :Username - Logged in user's username
 * @description Returns a success message or error message.
 * @authentication JWT authentication required
 */
app.delete(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username !== req.params.Username) {
      // username verification
      return res.status(400).send("Permission denied");
    }
    await Users.findOneAndDelete({ Username: req.params.Username })
      .then((user) => {
        if (!user) {
          res.status(404).send(req.params.Username + " was not found");
        } else {
          res.status(200).send(req.params.Username + " was deleted.");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * @route {GET} /movies
 * @name Get a list of all movies
 * @description Returns a JSON object holding all movie information
 * @authentication JWT authentication required
 */
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    await Movies.find()
      .then((movies) => {
        res.status(201).json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * @route {GET} /movies/:Title
 * @name Get movie information
 * @routeparam {string} :Title - The title of the movie
 * @description Returns a JSON object holding data about a single movie.
 * @authentication JWT authentication required
 */
app.get(
  "/movies/:Title",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    await Movies.findOne({ Title: req.params.Title })
      .then((title) => {
        res.json(title);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * @route {GET} /movies/genre/:Name
 * @name Get genre description
 * @routeparam {string} :Name - The name of the genre
 * @description Returns a JSON object holding the description of the genre
 * @authentication JWT authentication required
 */
app.get(
  "/movies/genre/:Genre",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    await Movies.findOne({ "Genre.Name": req.params.Genre })
      .select("Genre.Description")
      .then((movies) => {
        res.json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * @route {GET} /movies/directors/:Name
 * @name Get data about a director
 * @routeparam {string} :Name - The name of the director
 * @description Returns a JSON object holding data about the director.
 * @authentication JWT authentication required
 */
app.get(
  "/movies/directors/:Director",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    await Movies.findOne({ "Director.Name": req.params.Director })
      .select("Director")
      .then((movies) => {
        res.json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// log requests to console
app.use(morgan("common"));

// error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// listen for requests
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log("Listening on Port " + port);
});
