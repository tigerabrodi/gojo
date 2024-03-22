# Remix

Remix is a web framework built on top of the Web Fetch API, allowing for deployment on multiple platforms. It acts as a centralized bridge between the server and client, simplifying data fetching and UI rendering.

If Remix was e.g. built on top of node, it'd rely on node's specifics rather than being agnostic.

Unlike traditional web frameworks, Remix is not a server itself but a handler. This means it processes requests and generates responses without deciding how your application is hosted or deployed.

You own where to deploy your app, and Remix will work with it.

You create a request handler based on the adapter you're using, e.g. if deploying to Vercel, you'd use the Vercel adapter.

## What about the client?

When you land on a page, Remix makes a document request to the server, the server SSR's the page and sends it to the client, then the client, client side renders (hydrates) and takes it from there. This turns the page into a single page app.

# Deployed to Vercel

The project is deployed on Vercel, which uses serverless functions to serve requests. This setup allows for automatic scaling and reduces the operational overhead of managing servers. Under the hood, Vercel uses AWS Lambda to run serverless functions.

When a request hits the site hosted on Vercel, it's processed by Remix app handlers running as Vercel's serverless functions.

# Authenticaton

## Cookies

For authentication, the project uses HTTP cookies, which are straightforward to manage. They're secure as long as you follow best practices, e.g. setting the `Secure` and `HttpOnly` flags, and using `SameSite` to prevent CSRF attacks.

How you declare cookiee in Remix:

```javascript
const authCookie = createCookie('auth', {
  secrets: [secret],
  maxAge: 30 * 24 * 60 * 60,
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
})
```

- secrets: An array of secrets that may be used to sign/unsign the value of a cookie.
- maxAge: how long the cookie will last in seconds, here it's 30 days
- httpOnly: true means the cookie is only accessible by the server, not by JavaScript via `document.cookie`
- secure: true means the cookie is only sent over HTTPS, locally we use `false` for development since localhost is not HTTPS
- sameSite: "lax" means the cookie is sent with same-site requests

### SameSite requests explained

- Cookies are sent with requests initiated from the same site, ensuring smooth site functionality.
- Cookies are sent for some cross-site requests, like clicking on a link to the site, enhancing usability while maintaining security.
- Cookies are not sent for other cross-site requests (e.g., form submissions), helping prevent CSRF attacks.
- CSRF (Cross-Site Request Forgery) attacks are a type of security threat where an attacker tricks a user into performing actions they didn't intend to on a web application where they're logged in. By not sending cookies for these requests, the site is protected from CSRF attacks, e.g. clicking on a link in email that performs an action on a site where you're logged in.

## Passwords

We use a password based authentication. The password is hashed using `crypto.pbkdf2Sync` with a salt and 1000 iterations. The salt is stored in the database along with the hash.

When a user logs in, we hash the password they entered and compare it to the hash stored in the database.

How we create the hash:

```js
// Create a salt
// 16 bytes is the recommended size for a salt
// Having a salt added to the password before hashing it makes it more secure
// Reduces the risk of rainbow table attacks: https://en.wikipedia.org/wiki/PBKDF2
let salt = crypto.randomBytes(16).toString('hex')

// Create a hash
// 1000 stands for the number of iterations
// 64 is the length of the output hash
let hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex')
```

The salt is created using `crypto.randomBytes` and the hash is created using `crypto.pbkdf2Sync`.

How we compare the hash when a user logs in:

```js
let hash = crypto
  .pbkdf2Sync(password, user.Password.salt, 1000, 64, 'sha256')
  .toString('hex')

if (hash !== user.Password.hash) {
  return false
}
```

We use the user's salt and the password entered by the user to create a hash and compare it to the hash stored in the database.

If they match, the user is authenticated.

# Liveblocks for real-time collaboration

Liveblocks is the service used for the real-time collaboration stuff.

It's super neat, I love how it lets me be the one deciding how to authenticate.

Rather than being a complete package right away, it gives you the lego blocks for building collaborative web apps, including Browser Dev Tools for an awesome developer experience.

Another fun thing: It uses Cloudflare Durable objects [under the hood](https://liveblocks.io/docs/platform/websocket-infrastructure). The web socket servers sit on the edge. Meaning, the web socket servers are as close to the user as possible, which is great for latency.

# Database: Postgres on Railway

The database is a postgres database hosted on Railway. It's used to store permanent info that we may need elsewhere in the app outside of the board where real-time collaboration is happening.

For example, user information, board information, board roles (who has access), etc.
