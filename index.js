const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
// const _ = require('lodash');

const passport = require('passport');
const passportJWT = require('passport-jwt');

let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

let config = require('./config');
let middleware = require('./middleware');


let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = 'wowwow';

// lets create our strategy for web token
let strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
    console.log('payload received', jwt_payload);
    let user = getUser({ id: jwt_payload.id });

    if (user) {
        next(null, user);
    } else {
        next(null, false);
    }
});
// use the strategy
passport.use(strategy);

const app = express();
// initialize passport with express
app.use(passport.initialize());

// parse application/json
app.use(bodyParser.json());
//parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

const Sequelize = require('sequelize');

// initialze an instance of Sequelize
const sequelize = new Sequelize({
    database: 'users_db',
    username: 'kai',
    password: 'password',
    dialect: 'mysql',
});


// check the databse connection
sequelize
    .authenticate()
    .then(() => console.log('Connection has been established successfully.'))
    .catch(err => console.error('Unable to connect to the database:', err));

// create user model
const User = sequelize.define('user', {
    name: {
        type: Sequelize.STRING,
    },
    password: {
        type: Sequelize.STRING,
    },
});

const Blog = sequelize.define('blog', {
    title: {
        type: Sequelize.STRING,
    },
    description: {
        type: Sequelize.STRING,
    },
});

// create table with user model
User.sync()
    .then(() => console.log('User table created successfully'))
    .catch(err => console.log('oooh, did you enter wrong database credentials?'));

Blog.sync()
    .then(() => console.log('Blog table created successfully'))
    .catch(err => console.log('oooh, did you enter wrong database credentials?'));

// create some helper functions to work on the database
const createUser = async ({ name, password }) => {
    return await User.create({ name, password });
};

const getAllUsers = async () => {
    return await User.findAll();
};

const getUser = async obj => {
    return await User.findOne({
        where: obj,
    });
};

// create some helper functions to work on the database
const createBlog = async ({ title, description }) => {
    return await Blog.create({ title, description });
};

const updateBlog = async ({ title, description }) => {
    return await Blog.update({ title, description });
};

const getAllBlog = async () => {
    return await Blog.findAll();
};

const getBlog = async obj => {
    return await Blog.findOne({
        where: obj,
    });
};


// set some basic routes
app.get('/', function(req, res) {
    res.json({ message: 'Express is up!' });
});

// get all users
app.get('/users', function(req, res) {
    getAllUsers().then(user => res.json(user));
});
var cors = require('cors')

app.use(cors())
app.options('*', cors())


// get all blog
app.get('/blogs', cors(),
    function(req, res) {
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
        getAllBlog().then(user => res.json(user));
        // res.json({
        //     success: true,
        //     message: 'Index page'
        //   });
    });


// register route
app.post('/blogs', cors(), middleware.checkToken, function(req, res, next) {
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');

    const { title, description } = req.body;
    createBlog({ title, description }).then(user =>
        res.json({ user, msg: 'created successfully' })
    );
});


app.put('/blogs/:id', (req, res) => {
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    let sql = "UPDATE blogs SET title='" + req.body.title + "', description='" + req.body.description + "' WHERE id=" + req.params.id;
    let query = sequelize.query(sql, (err, results) => {
        if (err) throw err;

        res.send(JSON.stringify({ "status": 200, "error": null, "response": results }));
    });
});
app.delete('/blogs/:id', (req, res) => {
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    let sql = "DELETE FROM blogs WHERE id=" + req.params.id + "";
    let query = sequelize.query(sql, (err, results) => {
        if (err) throw err;
        res.send(JSON.stringify({ "status": 200, "error": null, "response": results }));
    });
});



app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

// register route
app.post('/register', cors(), function(req, res, next) {
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');

    const { name, password } = req.body;
    createUser({ name, password }).then(user =>
        res.json({ user, msg: 'account created successfully' })
    );
});

//login route
app.post('/login', async function(req, res, next) {
    const { name, password } = req.body;
    if (name && password) {
        let user = await getUser({ name: name });
        if (!user) {
            res.status(401).json({ message: 'No such user found' });
        }
        if (user.password === password) {
            // from now on we'll identify the user by the id and the id is the 
            // only personalized value that goes into our token
            let payload = { id: user.id };
            let token = jwt.sign(payload, config.secret);
            res.json({
                msg: 'ok',
                // username: 'asd',
                // roles: 'admin',
                token: token
            });
        } else {
            res.status(401).json({ msg: 'Password is incorrect' });
        }
    }
});

// protected route
app.get('/protected', passport.authenticate('jwt', { session: false }), function(req, res) {
    res.json('Success! You can now see this without a token.');
});

// start app
app.listen(3000, function() {
    console.log('Express is running on port 3000');
});