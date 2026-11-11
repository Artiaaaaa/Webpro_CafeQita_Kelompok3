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

const tableNumber = document.getElementById("table-number");

if (tableNumber) {
    tableNumber.textContent = idMeja ? "Meja " + idMeja : "Tanpa meja";
}

const cartKey = idMeja
    ? "cafeQitaCart_" + idMeja + "_" + (idPelanggan || "guest")
    : "cafeQitaCart_guest";

async function jalankan() {
    const escHtml = (t) =>
        String(t).replace(
            /[&<>"']/g,
            (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
        );
    const daftarMenu = await DataCafe.menu();
    document.getElementById("product-list").innerHTML = daftarMenu
        .map(
            (m) => `
    <article class="product-card" data-category="${escHtml(m.kategori)}">
        <div class="product-photo">☕</div>
        <div class="product-info">
            <h2>${escHtml(m.nama)}</h2>
            <p>${escHtml(m.kategori)}</p>
            <strong>Rp ${Number(m.harga).toLocaleString("id-ID")}</strong>
        </div>
        <button class="add-button" data-name="${escHtml(m.nama)}" data-price="${m.harga}" ${m.status === "Habis" ? "disabled" : ""}>${m.status === "Habis" ? "Habis" : "Tambah"}</button>
    </article>`
        )
        .join("");

    const categoryButtons = document.querySelectorAll(".category");
    const productCards = document.querySelectorAll(".product-card");

    categoryButtons.forEach((button) => {
        button.addEventListener("click", () => {
            categoryButtons.forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            const selectedCategory = button.dataset.category;

            productCards.forEach((card) => {
                const matches =
                    selectedCategory === "Semua" || card.dataset.category === selectedCategory;

                card.classList.toggle("hidden", !matches);
            });
        });
    });

    function formatRupiah(number) {
        return "Rp " + number.toLocaleString("id-ID");
    }

    let cart = cartKey ? JSON.parse(localStorage.getItem(cartKey)) || {} : {};

    document.querySelectorAll(".add-button").forEach((button) => {
        button.addEventListener("click", async () => {
            const name = button.dataset.name;
            const price = Number(button.dataset.price);

            if ((await DataCafe.menuHabis([name])).length) {
                alert(name + " sudah habis.");
                segarkanMenu();
                return;
            }

            if (!cart[name]) {
                cart[name] = {
                    price: price,
                    quantity: 0,
                };
            }

            cart[name].quantity++;

            saveCart();
        });
    });

    function saveCart() {
        localStorage.setItem(cartKey, JSON.stringify(cart));
        updateCart();
    }

    function updateCart() {
        let totalItems = 0;
        let totalPrice = 0;

        Object.values(cart).forEach((item) => {
            totalItems += item.quantity;
            totalPrice += item.price * item.quantity;
        });

        document.getElementById("cart-count").textContent = totalItems + " item";

        document.getElementById("cart-total").textContent = formatRupiah(totalPrice);
    }

    document.getElementById("view-cart").addEventListener("click", () => {
        const checkoutParams = new URLSearchParams();

        if (idMeja) checkoutParams.set("id_meja", idMeja);
        if (idPelanggan) checkoutParams.set("id_pelanggan", idPelanggan);

        window.location.href =
            "keranjang.html" + (checkoutParams.size ? "?" + checkoutParams.toString() : "");
    });

    updateCart();

    async function segarkanMenu() {
        const terbaru = await DataCafe.menu();
        const tombol = new Map(
            Array.from(document.querySelectorAll(".add-button")).map((b) => [b.dataset.name, b])
        );

        const berubah =
            terbaru.length !== tombol.size ||
            terbaru.some(
                (m) => !tombol.has(m.nama) || Number(tombol.get(m.nama).dataset.price) !== m.harga
            );
        if (berubah) {
            location.reload();
            return;
        }

        terbaru.forEach((m) => {
            const b = tombol.get(m.nama);
            b.disabled = m.status === "Habis";
            b.textContent = m.status === "Habis" ? "Habis" : "Tambah";
        });

        const habis = terbaru
            .filter((m) => m.status === "Habis" && cart[m.nama])
            .map((m) => m.nama);
        if (habis.length) {
            habis.forEach((n) => {
                delete cart[n];
            });
            saveCart();
            alert("Menu berikut sudah habis dan dihapus dari keranjang: " + habis.join(", "));
        }
    }
    DataCafe.pantau(segarkanMenu);
    segarkanMenu();
}

jalankan();
