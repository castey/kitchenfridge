# 🤊 KitchenFridge

**KitchenFridge** is a Discord-authenticated web application that allows users to purchase and manage digital credit ("Rex AI Credits") using Stripe. It includes:

* OAuth login with Discord via Passport.js
* Stripe Checkout integration
* Persistent credit tracking using MySQL
* EJS templating for authenticated views
* Webhook handling for Stripe payment confirmation

---

## 📦 Features

* 🔐 **Discord Login**: Users authenticate via Discord OAuth2.
* 💳 **Stripe Checkout**: Users can purchase credits through a Stripe-hosted checkout page.
* 📈 **Credit System**: Credits are stored and updated in a MySQL database.
* 🎛️ **Session Management**: Authenticated sessions via `express-session`.
* 🌐 **Webhook Endpoint**: Stripe webhooks automatically update user balances upon payment success.

---

## 🏗️ Project Structure

```
kitchenfridge/
├── public/               # Static assets (login HTML, CSS)
├── views/                # EJS templates for logged-in user views
├── src/
│   └── database.js       # MySQL credit management logic
├── .env                  # Environment configuration (not included in repo)
├── app.js                # Main Express server
```

---

## 🚀 How It Works

1. **User lands on `/`**:
   If not authenticated, they are shown a login page with a **"Login with Discord"** button.

2. **OAuth Flow**:
   Clicking the button starts the Discord OAuth flow using Passport.js.

3. **Session & Auth**:
   After login, user data is stored in session and they are redirected to `/home`.

4. **Home Page (`/home`)**:
   Displays the logged-in user's Discord username and their current credit balance (fetched from the database).

5. **Buy Credits**:
   Users can enter an amount and purchase credits using Stripe Checkout. After payment, Stripe sends a webhook to `/webhook` containing the user ID and amount.

6. **Webhook Handling**:
   The backend listens for `checkout.session.completed` and updates the user's credit using `updateClientCredit`.

---

## 🔐 Authentication

Authentication is handled using `passport-discord`. Only authenticated users can access `/home` and purchase credits.

Middleware used:

```js
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}
```

---

## 🧾 Credit Handling

Credit is stored in a MySQL table called `clients` with at least:

```sql
CREATE TABLE clients (
  userID VARCHAR(255) PRIMARY KEY,
  credit DECIMAL(10,2) DEFAULT 0
);
```

Two functions manage credit:

* `updateClientCredit(userID, amount)` – Adds credit or inserts a new row.
* `getClientCredit(userID)` – Fetches a user's credit value.

---

## ⚙️ Setup & Configuration

### Prerequisites

* Node.js + npm
* MySQL
* A Discord app with OAuth2 credentials
* A Stripe account

### .env Example

```env
PORT=3000
CLIENT_URL=http://localhost:3000

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Session secret
SESSION_SECRET=your_random_secret

# Stripe keys
STRIPE_PRIVATE_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=kitchenfridge
```

### Install & Run

```bash
npm install
node app.js
```

---

## 🔪 Testing Webhooks

If testing locally:

```bash
stripe listen --forward-to localhost:3000/webhook
```

---

## 🗅️ Frontend (Login + Credit Purchase UI)

Minimal HTML + JavaScript handles:

* Logging in via Discord
* Displaying welcome message and credit balance
* Input field for credit amount
* Button to trigger `/buy-credit`

Client script sends a POST request and redirects to the Stripe Checkout session.

---

## 🔐 Security Notes

* Be sure to **validate webhook signatures** in production.
* Never expose secrets (Discord or Stripe keys) publicly.
* Use HTTPS in production environments for secure cookies.

---

## 🤊 About the Name

> KitchenFridge – because the original version of this website was a website that took the images users created using the Facebook bot I made and stored them on a profile page. Like mom putting your stupid pictures on the kitchen frige.
