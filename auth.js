/**
 * @file auth.js
 * @description Contains the endpoint logic for authenticating the user and generating a JWT token.
 */

const jwtSecret = "your_jwt_secret"; // This has to be the same key used in the JWTStrategy

const jwt = require("jsonwebtoken"),
  passport = require("passport");

require("./passport"); // Local passport file

let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username, // Username encoded in the JWT
    expiresIn: "7d", // Token will expire after 7 days
    algorithm: "HS256", // Algorithm used to encode the values of the JWT
  });
};

/**
 * @route {POST} /login
 * @name User login
 * @queryparam {String} :Username - The username of the user
 * @queryparam {String} :Password - The password of the user
 * @returns {Object} 200 - An object containing the user details and the JWT token.
 * @returns {Object} 400 - An object indicating an error occurred or if the user is not authenticated.
 * @authentication No authentication required.
 * @description Generates JWT token for the user. Example: /login?Username=[username]&Password=[password]
 */
module.exports = (router) => {
  router.post("/login", (req, res) => {
    passport.authenticate("local", { session: false }, (error, user, info) => {
      if (error || !user) {
        return res.status(400).json({
          message: "Something is not right",
          user: user,
        });
      }
      req.login(user, { session: false }, (error) => {
        if (error) {
          res.send(error);
        }
        let token = generateJWTToken(user.toJSON());
        return res.json({ user, token });
      });
    })(req, res);
  });
};
