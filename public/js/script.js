
// --- Navbar and Profile Toggle ---
const navbar = document.querySelector('.header .flex .navbar'); // Navbar element
const profile = document.querySelector('.header .flex .profile'); // Profile element

// Toggle navbar visibility on menu button click
document.querySelector('#menu-btn').onclick = () => {
  navbar.classList.toggle('active');
  profile.classList.remove('active');
};

// Toggle profile visibility on user button click
document.querySelector('#user-btn').onclick = () => {
  profile.classList.toggle('active');
  navbar.classList.remove('active');
};

// Hide navbar and profile on scroll
window.onscroll = () => {
  profile.classList.remove('active');
  navbar.classList.remove('active');
};

// --- Loader Animation ---
function loader() {
  // Hide loader after fade out
  document.querySelector('.loader').style.display = 'none';
}

function fadeOut() {
  // Fade out loader after 2 seconds
  setInterval(loader, 2000);
}

window.onload = fadeOut;


// --- User Session and Logout ---
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Fetch current user session info
    const response = await fetch("/user");
    const user = await response.json();

    // Update profile name and login/register links based on session
    if (user) {
      document.querySelector(".name").textContent = user.name;
      document.querySelector(".account").style.display = "none"; // Hide login/register links
    } else {
      document.querySelector(".name").textContent = "Guest";
      document.querySelector(".account").style.display = "block";
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }

  // Logout: clear session and redirect to login
  document.querySelector(".delete-btn").addEventListener("click", async function () {
    await fetch("/logout");
    window.location.href = "/login.html";
  });
});


// --- Image Modal for Product Quick View ---
function setupImageModal() {
  // Attach click event to all .view-image elements to show modal
  document.querySelectorAll('.view-image').forEach(function(el) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function() {
      const src = this.getAttribute('data-img');
      // Create modal overlay
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = 0;
      modal.style.left = 0;
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.8)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = 9999;
      // Show product image in modal
      modal.innerHTML = `<img src='${src}' style='max-width:90vw;max-height:90vh;border-radius:10px;box-shadow:0 0 20px #000;'>`;
      // Remove modal on click
      modal.addEventListener('click', function() { document.body.removeChild(modal); });
      document.body.appendChild(modal);
    });
  });
}

// Always re-attach quick view modal after dynamic product rendering
function attachQuickViewModal() {
  document.querySelectorAll('.view-image').forEach(function(el) {
    el.onclick = function() {
      const src = el.getAttribute('data-img');
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = 0;
      modal.style.left = 0;
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.8)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = 9999;
      modal.innerHTML = `<img src='${src}' style='max-width:90vw;max-height:90vh;border-radius:10px;box-shadow:0 0 20px #000;'>`;
      modal.addEventListener('click', function() { document.body.removeChild(modal); });
      document.body.appendChild(modal);
    };
  });
}

// Patch dynamic product renderers to call attachQuickViewModal
window.attachMenuCategoryAddToCart = function() {
  const validPages = ["menu.html", "category/fastfood.html", "category/drinks.html", "category/deserts.html", "category/dishes.html"];
  if (!validPages.some(p => window.location.pathname.endsWith(p))) return;
  document.querySelectorAll(".products .box-container form.box").forEach(form => {
    form.onsubmit = async function (e) {
      e.preventDefault();
      const name = form.querySelector(".name").textContent.trim();
      const qty = form.querySelector("input.qty").value || 1;
      const res = await fetch("/products-by-name?name=" + encodeURIComponent(name));
      const products = await res.json();
      if (!products.length) {
        alert("Product not found in database. Please check product name in DB matches the menu.");
        return;
      }
      const product = products[0];
      const addRes = await fetch("/add-to-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id, quantity: qty })
      });
      const addData = await addRes.json();
      console.log('Add to Cart response:', addData); // Debug log
      if (addData.success) {
        window.location.href = "/cart.html";
      } else {
        alert(addData.error || "Failed to add to cart");
      }
    };
  });
  attachQuickViewModal();
};

// Patch home, menu, and category product renderers to call attachQuickViewModal after rendering
if (window.location.pathname.endsWith('menu.html')) {
  const origRenderMenuProducts = window.renderMenuProducts;
  window.renderMenuProducts = async function() {
    await origRenderMenuProducts();
    attachMenuCategoryAddToCart();
  }
}
if (window.location.pathname.endsWith('category/fastfood.html')) {
  const orig = window.renderFastFoodProducts;
  window.renderFastFoodProducts = async function() {
    await orig();
    attachMenuCategoryAddToCart();
  }
}
if (window.location.pathname.endsWith('category/dishes.html')) {
  const orig = window.renderDishesProducts;
  window.renderDishesProducts = async function() {
    await orig();
    attachMenuCategoryAddToCart();
  }
}
if (window.location.pathname.endsWith('category/drinks.html')) {
  const orig = window.renderDrinksProducts;
  window.renderDrinksProducts = async function() {
    await orig();
    attachMenuCategoryAddToCart();
  }
}
if (window.location.pathname.endsWith('category/deserts.html')) {
  const orig = window.renderDessertsProducts;
  window.renderDessertsProducts = async function() {
    await orig();
    attachMenuCategoryAddToCart();
  }
}

// --- Add to Cart for Home Page (index.html) ---
document.addEventListener("DOMContentLoaded", function () {
  if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") return;
  document.querySelectorAll(".products .box-container form.box").forEach(form => {
    form.onsubmit = async function (e) {
      e.preventDefault();
      const name = form.querySelector(".name").textContent.trim();
      const qty = form.querySelector("input.qty").value || 1;
      const res = await fetch("/products-by-name?name=" + encodeURIComponent(name));
      const products = await res.json();
      if (!products.length) {
        alert("Product not found in database. Please check product name in DB matches the menu.");
        return;
      }
      const product = products[0];
      const addRes = await fetch("/add-to-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id, quantity: qty })
      });
      const addData = await addRes.json();
      console.log('Add to Cart response:', addData); // Debug log
      if (addData.success) {
        window.location.href = "/cart.html";
      } else {
        alert(addData.error || "Failed to add to cart");
      }
    };
  });
  attachQuickViewModal();
});


// quick view 
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('.products .box-container .fas.fa-eye').forEach(function(el) {
    // Find the image src for this product
    const form = el.closest('form.box');
    const img = form ? form.querySelector('img') : null;
    if (img) {
      el.classList.add('view-image');
      el.setAttribute('data-img', img.getAttribute('src'));
      el.setAttribute('href', '#');
      el.onclick = function(e) { e.preventDefault(); };
    }
  });
});

// --- Dynamic Cart Count in Header ---
async function updateCartCount() {
  try {
    const res = await fetch('/cart-data');
    if (!res.ok) return;
    const items = await res.json();
    const count = Array.isArray(items) ? items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.textContent = count;
  } catch (e) {
    // Optionally handle error
  }
}

document.addEventListener('DOMContentLoaded', updateCartCount);
// Also update on cart changes if needed

// --- Add to Cart for Home Page Products ---
function attachHomeAddToCart() {
  if (!window.location.pathname.endsWith('index.html')) return;
  document.querySelectorAll(".products .box-container form.box").forEach(form => {
    form.onsubmit = async function (e) {
      e.preventDefault();
      const name = form.querySelector(".name").textContent.trim();
      const qty = form.querySelector("input.qty").value || 1;
      const res = await fetch("/products-by-name?name=" + encodeURIComponent(name));
      const products = await res.json();
      if (!products.length) {
        alert("Product not found in database. Please check product name in DB matches the menu.");
        return;
      }
      const product = products[0];
      const addRes = await fetch("/add-to-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id, quantity: qty })
      });
      const addData = await addRes.json();
      console.log('Add to Cart response:', addData); // Debug log
      if (addData.success) {
        window.location.href = "/cart.html";
      } else {
        alert(addData.error || "Failed to add to cart");
      }
    };
  });
  attachQuickViewModal();
}
// Patch home page dynamic loader to call this after rendering
if (window.location.pathname.endsWith('index.html')) {
  const origRenderHomeProducts = window.renderHomeProducts;
  window.renderHomeProducts = async function() {
    await origRenderHomeProducts();
    attachHomeAddToCart();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Attach Quick View for all .view-image elements (including dynamically rendered)
  function enableQuickView() {
    document.querySelectorAll('.view-image').forEach(function(el) {
      el.style.cursor = 'pointer';
      el.onclick = function(e) {
        e.preventDefault && e.preventDefault();
        const src = el.getAttribute('data-img') || el.getAttribute('href') || el.getAttribute('src');
        if (!src) return;
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = 0;
        modal.style.left = 0;
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.8)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = 9999;
        modal.innerHTML = `<img src='${src}' style='max-width:90vw;max-height:90vh;border-radius:10px;box-shadow:0 0 20px #000;'>`;
        modal.addEventListener('click', function() { document.body.removeChild(modal); });
        document.body.appendChild(modal);
      };
    });
  }
  // Initial attach
  enableQuickView();
  // Re-attach after any dynamic product rendering
  window.attachQuickViewModal = enableQuickView;
});

// --- Admin Page Password Prompt ---
        let editingId = null;
        async function fetchProducts() {
            const res = await fetch('/admin/products');
            const products = await res.json();
            const tbody = document.querySelector('#productsTable tbody');
            tbody.innerHTML = '';
            products.forEach(prod => {
                const tr = document.createElement('tr');
                if (editingId === prod._id) {
                    tr.innerHTML = `
                        <td><input type="text" value="${prod.image}" id="edit-image"></td>
                        <td><input type="text" value="${prod.name}" id="edit-name"></td>
                        <td><input type="number" value="${prod.price}" id="edit-price"></td>
                        <td><select id="edit-category">
                            <option value="Fast Food" ${prod.category==="Fast Food"?"selected":''}>Fast Food</option>
                            <option value="Dishes" ${prod.category==="Dishes"?"selected":''}>Dishes</option>
                            <option value="Drinks" ${prod.category==="Drinks"?"selected":''}>Drinks</option>
                            <option value="Dessert" ${prod.category==="Dessert"?"selected":''}>Dessert</option>
                        </select></td>
                        <td><input type="text" value="${prod.description}" id="edit-description"></td>
                        <td style="text-align:center;">
                            <button onclick="saveEdit('${prod._id}')" title="Save" style="background:#27ae60;color:#fff;">
                                <i class="fa-solid fa-floppy-disk"></i>
                            </button>
                            <button onclick="cancelEdit()" title="Cancel" style="background:#aaa;color:#fff;">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </td>
                        <td></td>
                    `;
                } else {
                    tr.innerHTML = `
                        <td><img src="${prod.image}" alt="${prod.name}"></td>
                        <td>${prod.name}</td>
                        <td>₹${prod.price}</td>
                        <td>${prod.category}</td>
                        <td>${prod.description}</td>
                        <td style="text-align:center;">
                            <button onclick="editProduct('${prod._id}')" title="Edit" style="background:#2980b9;color:#fff;">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                        </td>
                        <td style="text-align:center;">
                            <button class="delete" onclick="deleteProduct('${prod._id}')" title="Delete" style="background:#e74c3c;color:#fff;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    `;
                }
                tbody.appendChild(tr);
            });
        }
        function editProduct(id) {
            editingId = id;
            fetchProducts();
        }
        function cancelEdit() {
            editingId = null;
            fetchProducts();
        }
        async function saveEdit(id) {
            const data = {
                name: document.getElementById('edit-name').value,
                price: document.getElementById('edit-price').value,
                image: document.getElementById('edit-image').value,
                category: document.getElementById('edit-category').value,
                description: document.getElementById('edit-description').value
            };
            await fetch(`/admin/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            editingId = null;
            fetchProducts();
        }
        async function deleteProduct(id) {
            if (!confirm('Delete this product?')) return;
            await fetch(`/admin/products/${id}`, {
                method: 'DELETE',
            });
            fetchProducts();
        }
        document.getElementById('addProductForm').onsubmit = async function(e) {
            e.preventDefault();
            const data = {
                name: document.getElementById('name').value,
                price: document.getElementById('price').value,
                image: document.getElementById('image').value,
                category: document.getElementById('category').value,
                description: document.getElementById('description').value
            };
            await fetch('/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            this.reset();
            await fetchProducts();
        };
        async function fetchMessages() {
            const res = await fetch('/admin/messages');
            const messages = await res.json();
            const tbody = document.querySelector('#messagesTable tbody');
            tbody.innerHTML = '';
            messages.forEach(msg => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${msg.name}</td>
                    <td>${msg.email}</td>
                    <td>${msg.number}</td>
                    <td>${msg.msg}</td>
                    <td>${new Date(msg.createdAt).toLocaleString()}</td>
                `;
                tbody.appendChild(tr);
            });
        }
        async function fetchUsers() {
            const res = await fetch('/admin/users');
            const users = await res.json();
            const tbody = document.querySelector('#usersTable tbody');
            tbody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><input type="text" value="${user.name}" data-id="${user._id}" class="edit-user-name"></td>
                    <td><input type="email" value="${user.email}" data-id="${user._id}" class="edit-user-email"></td>
                    <td><input type="text" value="${user.number}" data-id="${user._id}" class="edit-user-number"></td>
                    <td><input type="text" value="${user.address}" data-id="${user._id}" class="edit-user-address"></td>
                    <td style="text-align:center;">
                        <button onclick="saveUserEdit('${user._id}')" title="Save" style="background:#27ae60;color:#fff;">
                            <i class="fa-solid fa-floppy-disk"></i>
                        </button>
                    </td>
                    <td style="text-align:center;">
                        <button onclick="deleteUser('${user._id}')" title="Delete" style="background:#e74c3c;color:#fff;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
        async function saveUserEdit(id) {
            const name = document.querySelector(`.edit-user-name[data-id='${id}']`).value;
            const email = document.querySelector(`.edit-user-email[data-id='${id}']`).value;
            const number = document.querySelector(`.edit-user-number[data-id='${id}']`).value;
            const address = document.querySelector(`.edit-user-address[data-id='${id}']`).value;
            const res = await fetch(`/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, number, address })
            });
            if (res.ok) {
                alert('User updated!');
                fetchUsers();
            } else {
                alert('Failed to update user');
            }
        }
        async function deleteUser(id) {
            if (!confirm('Are you sure you want to delete this user?')) return;
            const res = await fetch(`/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('User deleted!');
                fetchUsers();
            } else {
                alert('Failed to delete user');
            }
        }
        async function fetchOrders() {
            const res = await fetch('/admin/orders');
            const orders = await res.json();
            const tbody = document.querySelector('#ordersTable tbody');
            tbody.innerHTML = '';
            orders.forEach(order => {
                const date = new Date(order.createdAt).toLocaleString();
                const items = order.items.map(i => `${i.name} (${i.quantity})`).join(' - ');
                const payment = order.method ? order.method : 'Cash On Delivery';
                tbody.innerHTML += `
                    <tr>
                        <td>${date}</td>
                        <td>${order.userEmail}</td>
                        <td>${items}</td>
                        <td>₹${order.total}</td>
                        <td>${payment}</td>
                        <td style="text-align:center;">
                            <button onclick="deleteOrder('${order._id}')" title="Delete" style="background:#e74c3c;color:#fff;"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        async function deleteOrder(id) {
            if (!confirm('Are you sure you want to delete this order?')) return;
            const res = await fetch(`/admin/orders/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('Order deleted!');
                fetchOrders();
            } else {
                alert('Failed to delete order');
            }
        }
        document.addEventListener('DOMContentLoaded', () => {
            fetchProducts();
            fetchMessages();
            fetchUsers();
            fetchOrders();
        });


        // --- Cart Page Implementation ---
        document.addEventListener('DOMContentLoaded', async function () {
            const boxContainer = document.querySelector('.box-container');
            const grandTotalSpan = document.getElementById('cart-grand-total');
            // Fetch cart data
            async function loadCart() {
                const cartRes = await fetch('/cart-data');
                const cartItems = await cartRes.json();
                let grandTotal = 0;
                boxContainer.innerHTML = '';
                if (!cartItems.length) {
                    boxContainer.innerHTML = '<p style="text-align:center">Your cart is empty.</p>';
                } else {
                    cartItems.forEach(item => {
                        let imgPath = item.image;
                        if (imgPath.startsWith('uploaded_img/')) {
                            imgPath = '/' + imgPath.replace(/^uploaded_img\//, 'uploaded_img/');
                        }
                        const subTotal = item.price * item.quantity;
                        grandTotal += subTotal;
                        boxContainer.innerHTML += `
                        <div class="box">
                            <a href="#" class="fas fa-eye view-image" data-img="${imgPath}" title="Quick View"></a>
                            <button class="fas fa-times delete-item" type="button" data-id="${item.productId}" title="Delete"></button>
                            <img src="${imgPath}" alt="${item.name}">
                            <div class="name">${item.name}</div>
                            <div class="flex">
                                <div class="price"><span>₹</span>${item.price}</div>
                                <input type="number" name="qty" class="qty" min="1" max="99" value="${item.quantity}" data-id="${item.productId}" onkeypress="if(this.value.length == 2) return false;">
                                <button type="button" class="fas fa-edit update-qty" data-id="${item.productId}"></button>
                            </div>
                            <div class="sub-total">Sub Total : <span>₹${subTotal}</span></div>
                        </div>
                        `;
                    });
                }
                grandTotalSpan.innerText = `₹${grandTotal}`;
                attachCartEvents();
                if (window.attachQuickViewModal) window.attachQuickViewModal();
            }
            await loadCart();
            // Reset cart (delete all)
            document.getElementById('delete-all-btn').onclick = async function(e) {
                e.preventDefault();
                if (!confirm('Delete all from cart?')) return;
                const cartRes = await fetch('/cart-data');
                const cartItems = await cartRes.json();
                for (const item of cartItems) {
                    await fetch('/remove-from-cart', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId: item.productId })
                    });
                }
                await loadCart();
            };

            // Attach all cart item button events
            function attachCartEvents() {
                // Delete single item
                document.querySelectorAll('.delete-item').forEach(btn => {
                    btn.onclick = async function () {
                        if (!confirm('Delete this item?')) return;
                        await fetch('/remove-from-cart', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ productId: btn.dataset.id })
                        });
                        await loadCart();
                    };
                });
                // Update quantity
                document.querySelectorAll('.update-qty').forEach(btn => {
                    btn.onclick = async function () {
                        const input = btn.parentElement.querySelector('.qty');
                        const qty = parseInt(input.value);
                        if (qty < 1) return alert('Quantity must be at least 1');
                        btn.disabled = true;
                        btn.classList.add('updating');
                        const response = await fetch('/add-to-cart', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ productId: btn.dataset.id, quantity: qty })
                        });
                        btn.disabled = false;
                        btn.classList.remove('updating');
                        if (response.ok) {
                            // Show a quick success message
                            const msg = document.createElement('span');
                            msg.textContent = '✔';
                            msg.style.color = 'green';
                            msg.style.marginLeft = '8px';
                            btn.parentElement.appendChild(msg);
                            setTimeout(() => msg.remove(), 1000);
                        } else {
                            alert('Failed to update quantity');
                        }
                        await loadCart();
                    };
                });
            }
        });
        document.addEventListener('DOMContentLoaded', function () {
            const checkoutBtn = document.getElementById('checkout-orders-btn');
            if (checkoutBtn) {
                checkoutBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.location.href = 'checkout.html';
                });
            }
        });
        
        