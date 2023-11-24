const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_PRIVATE_KEY);
const database = require('./src/database.js');
const path = require('path');
require('dotenv').config();

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        // User is not authenticated, redirect to the login page
        res.redirect('/');
    }
}

const app = express();

// Stripe CLI webhook secret for testing locally
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {

        case 'checkout.session.completed':
            const session = event.data.object;
            
            // Use userId to update the user's credit
            database.updateClientCredit(session.metadata.user_id, session.metadata.amount); 
            break;
        
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).end();
});

app.use(express.json())

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));

// Middleware for serving static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Passport serialization setup
passport.serializeUser((user, done) => {
    // The user ID is serialized to the session, keeping the amount of data stored within the session small.
    done(null, user); // You might need to adjust this depending on the structure of your user object
});

passport.deserializeUser((user, done) => {
    // User deserialization from the session
    // You would typically find the user here by the serialized ID:
    // User.findById(id, (err, user) => done(err, user));
    done(null, user); // Replace with your own user retrieval logic
});

// Configure passport with your Discord strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify']
}, function (accessToken, refreshToken, profile, done) {

    // Continue with your user handling logic
    done(null, profile);
}));

// Set up session management
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Changed to false to avoid storing session cookies for unauthenticated requests
    cookie: {
        secure: 'auto', // Changed to 'auto' for compatibility with both HTTP and HTTPS during development
        maxAge: 24 * 60 * 60 * 1000 // Optional: setting cookie to expire after 1 day
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// GET paths
// Serve login page
app.get('/', (req, res) => {
    // Check if the user is already authenticated
    if (req.isAuthenticated()) {
        // User is authenticated, redirect to the home page
        res.redirect('/home');
    } else {
        // User is not authenticated, serve the login page
        res.sendFile(path.join(__dirname, '/public/login.html'));
    }
});

// Define routes for login and callback
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    function (req, res) {
        // Successful authentication
        res.redirect('/home');
    }
);

// Define a success route for successful authentication
app.get('/home', ensureAuthenticated, (req, res) => {
    console.log(req.user)

    async function displayResults() {
        let credit = await database.getClientCredit(req.user.id);
        res.render('home', { username: req.user.username, credit: credit.toFixed(2) });
    }

    displayResults();
});

// POST paths
app.post('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');  // Redirect to the home or login page after logging out
    });
});

// buy credits route with Stripe
app.post('/buy-credit', async (req, res) => {
    try {
        const creditAmount = parseFloat(req.body.amount);

        // Validate the amount
        if (isNaN(creditAmount) || creditAmount <= 0) {
            throw new Error("Invalid payment amount. Amount must be a positive number.");
        }

        // Convert to cents and round to nearest integer to avoid fractional cents
        const amountInCents = Math.round(creditAmount * 100);

        // Create a session with Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [{
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Buy Rex AI Credits!",
                    },
                    unit_amount: amountInCents,
                },
                quantity: 1, // One line item for the total credit purchase
            }],
            success_url: `${process.env.CLIENT_URL}/home?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/home`,
            metadata: {
                user_id: req.user.id,
                amount: creditAmount
            }
        });

        res.json({ url: session.url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});