const params = new URLSearchParams(window.location.search);

let idMeja = params.get("id_meja");
let idPelanggan = params.get("id_pelanggan");

if (idMeja) {
    sessionStorage.setItem("idMeja", idMeja);
}

if (idPelanggan) {
    sessionStorage.setItem("idPelanggan", idPelanggan);
}

idMeja = idMeja || sessionStorage.getItem("idMeja");
idPelanggan = idPelanggan || sessionStorage.getItem("idPelanggan");

const cartKey = idMeja
    ? "cafeQitaCart_" + idMeja + "_" + (idPelanggan || "guest")
    : "cafeQitaCart_guest";

const cartItems = document.getElementById("cart-items");
const totalItems = document.getElementById("total-items");
const totalPrice = document.getElementById("total-price");
const confirmButton = document.getElementById("confirm-order");

const popup = document.getElementById("confirmation-popup");

const cancelButton = document.getElementById("cancel-order");
const paymentButton = document.getElementById("continue-payment");

const tableNumber = document.getElementById("table-number");
const summaryTableNumber = document.getElementById("summary-table-number");

if (
    !cartItems ||
    !totalItems ||
    !totalPrice ||
    !confirmButton ||
    !popup ||
    !cancelButton ||
    !paymentButton
) {
    console.error("Ada elemen HTML keranjang yang belum ditemukan.");
} else {
    const tableLabel = idMeja ? "Meja " + idMeja : "Tanpa meja";

    if (tableNumber) {
        tableNumber.textContent = tableLabel;
    }

    if (summaryTableNumber) {
        summaryTableNumber.textContent = tableLabel;
    }

    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};

    function formatRupiah(number) {
        return "Rp " + number.toLocaleString("id-ID");
    }

    function renderCart() {
        cartItems.innerHTML = "";

        const entries = Object.entries(cart);

        let itemCount = 0;
        let grandTotal = 0;

        if (entries.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <span>☕</span>
                    <h2>Keranjang masih kosong</h2>
                    <p>Yuk, pilih menu favoritmu!</p>
                    <a href="menu.html">Lihat Menu</a>
                </div>
            `;

            totalItems.textContent = "0";
            totalPrice.textContent = formatRupiah(0);
            confirmButton.disabled = true;

            return;
        }

        confirmButton.disabled = false;

        entries.forEach(([name, item]) => {
            const subtotal = item.price * item.quantity;

            itemCount += item.quantity;
            grandTotal += subtotal;

            const card = document.createElement("article");
            card.className = "cart-item";

            card.innerHTML = `
                <div class="cart-photo">☕</div>

                <div class="cart-info">
                    <h2>${name}</h2>
                    <p>${formatRupiah(subtotal)}</p>
                </div>

                <div class="quantity-control">
                    <button class="minus-button">−</button>
                    <span class="quantity-number">${item.quantity}</span>
                    <button class="plus-button">+</button>
                </div>
            `;

            card.querySelector(".minus-button").addEventListener("click", () => {
                changeQuantity(name, -1);
            });

            card.querySelector(".plus-button").addEventListener("click", () => {
                changeQuantity(name, 1);
            });

            cartItems.appendChild(card);
        });

        totalItems.textContent = itemCount;
        totalPrice.textContent = formatRupiah(grandTotal);
    }

    function changeQuantity(name, change) {
        if (!cart[name]) return;

        cart[name].quantity += change;

        if (cart[name].quantity <= 0) {
            delete cart[name];
        }

        saveCart();
    }

    function saveCart() {
        localStorage.setItem(cartKey, JSON.stringify(cart));
        renderCart();
    }

    confirmButton.addEventListener("click", () => {
        if (Object.keys(cart).length === 0) {
            alert("Keranjang masih kosong!");
            return;
        }

        popup.classList.add("show");
    });

    function closePopup() {
        popup.classList.remove("show");
    }

    popup.addEventListener("click", (event) => {
        if (event.target === popup) {
            closePopup();
        }
    });

    cancelButton.addEventListener("click", () => {
        closePopup();
    });

    paymentButton.addEventListener("click", async () => {
        if (await bersihkanMenuHabis()) {
            closePopup();
            return;
        }

        const paymentParams = new URLSearchParams();

        if (idMeja) paymentParams.set("id_meja", idMeja);
        if (idPelanggan) paymentParams.set("id_pelanggan", idPelanggan);

        window.location.href =
            "pembayaran.html" + (paymentParams.size ? "?" + paymentParams.toString() : "");
    });

    async function bersihkanMenuHabis() {
        const habis = await DataCafe.menuHabis(Object.keys(cart));
        if (!habis.length) return false;
        habis.forEach((nama) => {
            delete cart[nama];
        });
        saveCart();
        alert("Maaf, menu berikut sudah habis dan dihapus dari keranjang: " + habis.join(", "));
        return true;
    }

    renderCart();
    bersihkanMenuHabis();
    DataCafe.pantau(bersihkanMenuHabis);
}
