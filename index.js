/**
 * @file index.js
 * @description Main entry point for the MovieBase API server. Sets up routes, middleware, and configurations.
 */

const mongoose = require("mongoose");
// mongoose.connect('mongodb://localhost:27017/myflixdb', { useNewUrlParser: true, useUnifiedTopology: true });
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
 * CORS configuration.
 * @description Configures the CORS policy for the application.
 */
const cors = require("cors");
let allowedOrigins = [
  "http://localhost:1234",
  "http://localhost:4200",
  "https://projectmoviebase.netlify.app",
  "https://elodloic.github.io",
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
 * @route GET /
 * @description Root endpoint that displays a welcome message.
 * @returns {string} Welcome message with a link to documentation.
 */
app.get("/", (req, res) => {
  res.send(
    "Welcome to the MovieBase API! Please see /documentation.html for more information."
  );
});

/* GET USERS (future admin feature)
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
*/

/**
 * @route GET /users/:Username
 * @description Get a user by their username.
 * @param {string} Username - The username of the user.
 * @returns {Object} The user object if found, otherwise an error message.
 * @access Protected (JWT authentication required)
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
 * @route POST /users
 * @description Create a new user.
 * @body {string} Username - The username of the new user (must be at least 5 characters).
 * @body {string} Password - The password of the new user.
 * @body {string} Email - The email of the new user.
 * @body {string} [Birthday] - The birthday of the new user (optional).
 * @returns {Object} The newly created user object or an error message.
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
 * @route PUT /users/:Username
 * @description Update a user's information.
 * @param {string} Username - The username of the user to update.
 * @body {string} [Username] - The new username for the user (optional).
 * @body {string} [Password] - The new password for the user (optional).
 * @body {string} [Email] - The new email for the user (optional).
 * @body {string} [Birthday] - The new birthday for the user (optional).
 * @returns {Object} The updated user object or an error message.
 * @access Protected (JWT authentication required)
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
 * @route POST /users/:Username/movies/:MovieID
 * @description Add a movie to a user's list of favorite movies.
 * @param {string} Username - The username of the user.
 * @param {string} MovieID - The ID of the movie.
 * @returns {object} Updated user's favorite movies.
 * @access Protected
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
 * @route DELETE /users/:Username/movies/:MovieID
 * @description Remove a movie from a user's list of favorite movies.
 * @param {string} Username - The username of the user.
 * @param {string} MovieID - The ID of the movie.
 * @returns {object} Updated user's favorite movies.
 * @access Protected
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
 * @route DELETE /users/:Username
 * @description Delete a user by their username.
 * @param {string} Username - The username of the user to delete.
 * @returns {string} Success message or error message.
 * @access Protected
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
 * @route GET /movies
 * @description Get a list of all movies.
 * @returns {object[]} Array of movie objects.
 * @access Protected
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
 * @route GET /movies/:Title
 * @description Get a movie by its title.
 * @param {string} Title - The title of the movie.
 * @returns {object} Movie object.
 * @access Protected
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
 * @route GET /movies/genre/:Name
 * @description Get movies by genre name.
 * @param {string} Name - The name of the genre.
 * @returns {object} Genre object containing movie information.
 * @access Protected
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
 * @route GET /movies/directors/:Name
 * @description Get movies by director name.
 * @param {string} Name - The name of the director.
 * @returns {object} Director object containing movie information.
 * @access Protected
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
