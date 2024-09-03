# MovieBase API Documentation

**The API is still under development.**

Available endpoints:

| Business Logic | URL | HTTP Method | Request body data format | Response body data format |
| --- | --- | --- | --- | --- |
| Return a list of all movies | /movies | GET | None | A JSON object holding all movie information |
| Return movie information by title | /movies/\[title\] | GET | None | A JSON object holding data about a single movie |
| Return genre description by name/title | /movies/genre/\[genre\] | GET | None | A JSON object holding the description of the genre |
| Return data about a director (bio, birth year, death year) by name | /movies/directors/\[name\] | GET | None | A JSON object holding data about the director |
| Return information about the logged in user | /users/\[username\] | GET | None | A JSON object with the user's information |
| Register new user account | /users/ | POST | { Username: String,  <br>Password: String,  <br>Email: String,  <br>Birthday: Date (YYYY-MM-DD) } | A JSON object with the username and the user's ID |
| Update user data | /users/\[username\] | PUT | { Username: String, (required)  <br>Password: String, (required)  <br>Email: String, (required)  <br>Birthday: Date (YYYY-MM-DD) } | A JSON object with the updated username, the user's ID and their list of favorite movies |
| Add movie to user's favorites | /users/\[username\]/movies/\[movie ID\] | POST | None | A JSON object with the user's ID and their favorite movies list |
| Remove movie from user's favorites | /users/\[username\]/movies/\[movie ID\] | DELETE | None | A JSON object with the user's ID and their favorite movies list |
| Remove user | /users/\[username\] | DELETE | None | Success- or error message |
| Login user | /login?Username=\[username\]&Password=\[password\] | POST | None | Success- or error message |
