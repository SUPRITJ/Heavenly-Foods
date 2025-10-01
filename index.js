const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session"); // Import session
const path = require("path");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/uploaded_img', express.static(path.join(__dirname, 'public', 'uploaded_img'))); // Serve uploaded images

// Session Configuration
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Change to `true` if using HTTPS
  })
);

const dbUrl = "mongodb+srv://Admin69:root69@cluster0.0u2vw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbUrl)
  .then(() => {
    console.info("Connected to Database");
  })
  .catch((e) => {
    console.error("Database Connection Error:", e);
  });

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  number: String, // phone number
  password: String,
  address: { type: String, default: '' }
});
const User = mongoose.model("User", userSchema);

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  category: String,
  description: String,
});
const Product = mongoose.model("Product", productSchema);

const cartSchema = new mongoose.Schema({
  userEmail: String, // For logged-in users
  sessionId: String, // For guest carts
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      price: Number,
      image: String,
      quantity: Number,
    },
  ],
});
const Cart = mongoose.model("Cart", cartSchema);

const orderSchema = new mongoose.Schema({
  userEmail: String,
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      price: Number,
      image: String,
      quantity: Number,
    },
  ],
  total: Number,
  method: { type: String, default: 'Cash On Delivery' }, // Payment method
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model("Order", orderSchema);

// --- Contact Message Schema ---
const contactSchema = new mongoose.Schema({
  name: String,
  number: String,
  email: String,
  msg: String,
  createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

// Register Route 
app.post("/register", async (req, res) => {
  const { name, email, number, pass, cpass, flat, street, city, state, country, pin_code } = req.body;

  if (pass !== cpass) {
    return res.send(`<script>alert("Passwords do not match"); window.location.href = "/register.html";</script>`);
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send(`<script>alert("User already exists"); window.location.href = "/login.html";</script>`);
    }

    // Compose address if provided
    let address = '';
    if (flat || street || city || state || country || pin_code) {
      address = `${flat || ''}, ${street || ''}, ${city || ''}, ${state || ''}, ${country || ''} - ${pin_code || ''}`.replace(/^[,\s]+|[,\s]+$/g, '');
    }

    const newUser = new User({ name, email, number, password: pass, address });

    await newUser.save();
    console.log("User Registered Successfully");
    return res.send(`<script>alert("Registration successful"); window.location.href = "/index.html";</script>`);
  } catch (err) {
    console.error("Error Registering User:", err);
    return res.send(`<script>alert("Error registering user"); window.location.href = "/register.html";</script>`);
  }
});

// Login Route 
app.post("/login", async (req, res) => {
  const { email, pass } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.send(`<script>alert("User not found"); window.location.href = "/login.html";</script>`);
    }

    if (user.password !== pass) {
      return res.send(`<script>alert("Invalid password"); window.location.href = "/login.html";</script>`);
    }

    // Store User Session (ensure all fields are present)
    req.session.user = { name: user.name, email: user.email, phone: user.number, address: user.address || '' };

    console.log("User Logged In Successfully");
    return res.send(`<script>alert("Login successful"); window.location.href = "/index.html";</script>`);
  } catch (err) {
    console.error("Error Logging In:", err);
    return res.status(500).send(`<script>alert("Error logging in. Please try again later."); window.location.href = "/login.html";</script>`);
  }
});

// Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

// API to Get Logged-in User Data
app.get("/user", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.json(null);
  }
});

// --- Add to Cart Endpoint ---
app.post("/add-to-cart", async (req, res) => {
  const { productId, quantity } = req.body;
  // Require user to be logged in before adding to cart
  if (!req.session.user) {
    return res.status(401).json({ error: "Please login to add items to cart." });
  }
  let cartQuery = { userEmail: req.session.user.email };
  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    let cart = await Cart.findOne(cartQuery);
    if (!cart) {
      cart = new Cart({ ...cartQuery, items: [] });
    }
    // Prevent duplicate items: always set quantity for existing, never add duplicate
    const existing = cart.items.find((item) => item.productId.equals(product._id));
    if (existing) {
      existing.quantity = parseInt(quantity); // Set to new value
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: parseInt(quantity),
      });
    }
    cart.items = cart.items.reduce((acc, item) => {
      const found = acc.find(i => i.productId.equals(item.productId));
      if (!found) acc.push(item);
      return acc;
    }, []);
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

// --- Get Cart Endpoint ---
app.get("/cart-data", async (req, res) => {
  let cart = null;
  if (req.session.user) {
    cart = await Cart.findOne({ userEmail: req.session.user.email });
  } else if (req.sessionID) {
    cart = await Cart.findOne({ sessionId: req.sessionID });
  }
  res.json(cart ? cart.items : []);
});

// --- Remove from Cart Endpoint ---
app.post("/remove-from-cart", async (req, res) => {
  const { productId } = req.body;
  let cartQuery = {};
  if (req.session.user) {
    cartQuery.userEmail = req.session.user.email;
  } else {
    cartQuery.sessionId = req.sessionID;
  }
  try {
    const cart = await Cart.findOne(cartQuery);
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    cart.items = cart.items.filter((item) => !item.productId.equals(productId));
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove from cart" });
  }
});

// --- Place Order Endpoint ---
app.post("/place-order", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  try {
    const cart = await Cart.findOne({ userEmail: req.session.user.email });
    if (!cart || cart.items.length === 0) return res.status(400).json({ error: "Cart is empty" });
    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const method = req.body.method || 'Cash On Delivery';
    const order = new Order({
      userEmail: req.session.user.email,
      items: cart.items,
      total,
      method
    });
    await order.save();
    cart.items = [];
    await cart.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: "Failed to place order" });
  }
});

// --- Get Orders Endpoint ---
app.get("/orders-data", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  const orders = await Order.find({ userEmail: req.session.user.email }).sort({ createdAt: -1 });
  res.json(orders);
});

// --- Helper endpoint for product lookup by name (for demo, you should use productId in production) ---
app.get('/products-by-name', async (req, res) => {
  const products = await Product.find({ name: req.query.name });
  res.json(products);
});

// --- ADMIN PRODUCT MANAGEMENT ENDPOINTS ---
// List all products
app.get('/admin/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Add a product
app.post('/admin/products', async (req, res) => {
  try {
    const { name, price, image, category, description } = req.body;
    const product = new Product({ name, price, image, category, description });
    await product.save();
    res.json({ success: true, product });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Delete a product by ID
app.delete('/admin/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update a product by ID
app.put('/admin/products/:id', async (req, res) => {
  try {
    const { name, price, image, category, description } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { name, price, image, category, description }, { new: true });
    res.json({ success: true, product });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// --- Admin: Get Contact Messages ---
app.get('/admin/messages', async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// --- Admin: Get All Users ---
app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// --- Admin: Update User ---
app.put('/admin/users/:id', async (req, res) => {
  try {
    const { name, email, number, address } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, email, number, address }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// --- Admin: Delete User ---
app.delete('/admin/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- Admin: Get All Orders ---
app.get('/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// --- Admin: Delete Order ---
app.delete('/admin/orders/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Serve HTML Files
const htmlFiles = [
  "index.html",
  "register.html",
  "login.html",
  "about.html",
  "cart.html",
  "checkout.html",
  "contact.html",
  "menu.html",
  "orders.html",
  "profile.html",
  "search.html",
  "update_address.html",
  "update_profile.html"
];

htmlFiles.forEach(file => {
  app.get(`/${file}`, (req, res) => {
    res.sendFile(path.join(__dirname, "public", file));
  });
});

// Serve category HTML files
const categoryFiles = [
  "fastfood.html",
  "drinks.html",
  "deserts.html",
  "dishes.html"
];
categoryFiles.forEach(file => {
  app.get(`/category/${file}`, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "category", file));
  });
});

// --- Profile Data Endpoint for Checkout Page ---
app.get('/profile-data', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({
    name: req.session.user.name || '',
    email: req.session.user.email || '',
    phone: req.session.user.phone || '',
    address: req.session.user.address || ''
  });
});

// --- Update Profile Endpoint ---
app.post('/update-profile', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  const { name, email, number, old_pass, new_pass, confirm_pass } = req.body;
  // Validate new password
  if (new_pass && new_pass !== confirm_pass) {
    return res.status(400).json({ error: 'New passwords do not match' });
  }
  try {
    // Find user (assuming User model exists and email is unique)
    const user = await User.findOne({ email: req.session.user.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Check old password if changing password
    if (new_pass) {
      if (user.password !== old_pass) {
        return res.status(400).json({ error: 'Old password is incorrect' });
      }
      user.password = new_pass;
    }
    const oldEmail = user.email;
    user.name = name;
    user.email = email;
    user.number = number; // update number field
    await user.save();
    // If email changed, update cart userEmail as well
    if (oldEmail !== email) {
      await Cart.updateMany({ userEmail: oldEmail }, { $set: { userEmail: email } });
    }
    // Update session (ensure all fields are present)
    req.session.user.name = name;
    req.session.user.email = email;
    req.session.user.phone = number;
    req.session.user.address = user.address || '';
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// --- Update Address Endpoint ---
app.post('/update-address', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  const { flat, street, city, state, country, pin_code } = req.body;
  const address = `${flat}, ${street}, ${city}, ${state}, ${country} - ${pin_code}`;
  try {
    // Find user (assuming User model exists and email is unique)
    const user = await User.findOne({ email: req.session.user.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.address = address;
    await user.save();
    req.session.user.address = address;
    req.session.user.phone = user.number;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// --- Contact Form Endpoint ---
app.post('/contact', async (req, res) => {
  try {
    const { name, number, email, msg } = req.body;
    if (!name || !number || !email || !msg) return res.json({ success: false, error: 'All fields required.' });
    await Contact.create({ name, number, email, msg });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: 'Failed to send message.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

