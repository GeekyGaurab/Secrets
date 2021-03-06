require("dotenv").config();
require("https").globalAgent.options.rejectUnauthorized = false;
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const HttpsProxyAgent = require("https-proxy-agent");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("db connected!"))
  .catch((err) => console.log(err));

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
  secrets: []
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

const gStrategy = new GoogleStrategy(
  {
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets-gaurab.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  function (accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({ username: profile.emails[0].value, googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
);

const fStrategy = new FacebookStrategy(
  {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://secrets-gaurab.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
);

if (process.env.IS_PROXY) {
  const agent = new HttpsProxyAgent("http://172.16.199.40:8080");
  gStrategy._oauth2.setAgent(agent);
  fStrategy._oauth2.setAgent(agent);
}

passport.use(gStrategy);
passport.use(fStrategy);

app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/auth/facebook",
  passport.authenticate("facebook")
);

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/secrets", function (req, res) {
  User.find({ secrets: { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        // console.log(foundUsers);
        res.render("secrets", { usersWithSecrets: foundUsers });
      }
    }
  });
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/submit", function (req, res, next) {
  //console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function (req, res) {
  const submittedSecret = req.body.secret;
  // console.log(req.user._id);
  User.findById(req.user._id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secrets.push(submittedSecret);
        foundUser.save(function () {
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("secrets");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000!");
});




















// require("dotenv").config();
// const express = require("express");
// const bodyParser = require("body-parser");
// const ejs = require("ejs");
// const mongoose = require("mongoose");
// // const encrypt = require("mongoose-encryption");
// // const md5 = require("md5");
// // const bcrypt = require("bcrypt");
// // const saltRounds = 10;
// const session = require("express-session");
// const passport = require("passport");
// const passportLocalMongoose = require("passport-local-mongoose");
// const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const findOrCreate = require('mongoose-findorcreate');
// const FacebookStrategy = require("passport-facebook");
// //const alert = require("alert");
// //const popup = require("popups");

// const app = express();

// app.set("view engine", "ejs");
// app.use(bodyParser.urlencoded({extended: true}));
// app.use(express.static("public"));

// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false
// }));

// app.use(passport.initialize());
// app.use(passport.session());

// mongoose.connect("mongodb+srv://GeekyGaurab:" + process.env.MONGODB_PASSWORD + "@cluster0.q0fhu.mongodb.net/secretsDB");

// const userSchema = new mongoose.Schema({
//   email: String,
//   password: String,
//   googleId: String,
//   facebookId: String,
//   secrets: []
// });

// //userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});
// userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(findOrCreate);

// const User = new mongoose.model("User", userSchema);

// passport.use(User.createStrategy());

// passport.serializeUser(function(user, done) {
//   done(null, user.id);
// });

// passport.deserializeUser(function(id, done) {
//   User.findById(id, function(err, user) {
//     done(err, user);
//   });
// });

// passport.use(new GoogleStrategy({
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: "https://secrets-gaurab.herokuapp.com/auth/google/secrets",
//     userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     //console.log(profile);

//     User.findOrCreate({ googleId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

// passport.use(new FacebookStrategy({
//     clientID: process.env.FACEBOOK_APP_ID,
//     clientSecret: process.env.FACEBOOK_APP_SECRET,
//     callbackURL: "https://secrets-gaurab.herokuapp.com/auth/facebook/secrets"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     //console.log(profile);

//     User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

// app.get("/", function(req, res) {
//   res.render("home");
// });

// app.get("/auth/google",
//   passport.authenticate("google", { scope: ["profile"] })
// );

// app.get("/auth/google/secrets",
//   passport.authenticate("google", { failureRedirect: "/login" }),
//   function(req, res) {
//     // Successful authentication, redirect to secrets.
//     res.redirect("/secrets");
// });

// app.get("/auth/facebook",
//   passport.authenticate("facebook")
// );

// app.get("/auth/facebook/secrets",
//   passport.authenticate("facebook", { failureRedirect: "/login" }),
//   function(req, res) {
//     // Successful authentication, redirect to secrets.
//     res.redirect('/secrets');
// });

// app.get("/login", function(req, res) {
//   res.render("login");
// });

// app.get("/register", function(req, res) {
//   res.render("register");
// });

// app.get("/secrets", function(req, res) {

//   User.find({secrets: {$ne: null}}, function(err, foundUsers) {
//     res.render("secrets", {usersWithSecrets: foundUsers});
//   });

// });

// app.get("/logout", function(req, res) {
//   req.logout();
//   res.redirect("/");
// });

// app.get("/submit", function(req, res) {
//   if(req.isAuthenticated()) {
//     res.render("submit");
//   } else {
//     res.redirect("/login");
//   }
// });

// app.post("/submit", function(req, res) {
//   User.findById(req.user.id, function(err, user) {
//     if(err) {
//       console.log(err);
//     } else {
//       if(user) {
//         user.secrets.push(req.body.secret);

//         user.save(function(err) {
//           if(err) {
//             console.log(err);
//           } else {
//             res.redirect("/secrets");
//           }
//         })

//       } else {
//         res.redirect("/register");
//       }
//     }
//   });
// });

// app.post("/register", function(req, res) {

//   User.register({username: req.body.username}, req.body.password, function(err, user) {
//     if(!user) {
//       console.log("Already registered user!");
//       res.redirect("/login");
//     } else {
//       if(err) {
//         console.log(err);
//         res.redirect("/register");
//       } else {
//         passport.authenticate("local")(req, res, function() {
//           res.redirect("/secrets");
//         });
//       }
//     }
//   });

// });

// app.post("/login", function(req, res) {

//   const newUser = new User({
//     username: req.body.username,
//     password: req.body.password
//   });

//   req.login(newUser, function(err) {
//     if(err) {
//       console.log(err);
//     } else {
//       passport.authenticate("local")(req, res, function() {
//         res.redirect("/secrets");
//       });
//     }
//   });

// });

// let port = process.env.PORT;
// if(port == null || port == "") {
//   port = 3000;
// }

// app.listen(port, function() {
//   console.log("Server up and running on port 3000!");
// });
