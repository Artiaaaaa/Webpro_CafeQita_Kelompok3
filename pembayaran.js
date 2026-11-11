(() => {
    const params = new URLSearchParams(location.search);
    let meja = params.get("id_meja") || sessionStorage.getItem("idMeja");
    let pelanggan = params.get("id_pelanggan") || sessionStorage.getItem("idPelanggan");
    if (meja) sessionStorage.setItem("idMeja", meja);
    if (pelanggan) sessionStorage.setItem("idPelanggan", pelanggan);
    const cartKey = meja ? `cafeQitaCart_${meja}_${pelanggan || "guest"}` : "cafeQitaCart_guest";
    const cart = JSON.parse(localStorage.getItem(cartKey) || "{}");
    const items = Object.entries(cart)
        .filter(([, v]) => v.quantity > 0)
        .map(([nama, v]) => ({ nama, harga: Number(v.price), qty: Number(v.quantity) }));
    const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");
    const el = (id) => document.getElementById(id);
    if (!items.length) {
        location.replace("menu.html" + location.search);
        return;
    }
    el("table-number").textContent = meja ? "Meja " + meja : "Tanpa meja";
    el("back-link").href = "keranjang.html" + location.search;
    const subtotal = items.reduce((s, i) => s + i.harga * i.qty, 0);
    const pajak = Math.round(subtotal * 0.1);
    const total = subtotal + pajak;
    el("order-summary").innerHTML =
        items
            .map(
                (i) =>
                    `<div class="checkout-row"><span>${i.qty} × ${i.nama}</span><strong>${rupiah(i.harga * i.qty)}</strong></div>`
            )
            .join("") +
        `<div class="checkout-divider"></div><div class="checkout-row"><span>Subtotal</span><strong>${rupiah(subtotal)}</strong></div><div class="checkout-row"><span>Pajak (10%)</span><strong>${rupiah(pajak)}</strong></div>`;
    el("grand-total").textContent = rupiah(total);

    const overlay = el("confirm-overlay");
    const escapeHTML = (value) =>
        String(value).replace(
            /[&<>"']/g,
            (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
        );
    const closeConfirmation = () => {
        overlay.hidden = true;
        el("continue-payment").focus();
    };
    const openConfirmation = () => {
        const nama = el("customer-name").value.trim();
        if (!nama) {
            el("name-error").hidden = false;
            el("customer-name").focus();
            return;
        }
        el("name-error").hidden = true;
        el("confirm-message").innerHTML =
            `Atas nama <strong>${escapeHTML(nama)}</strong>, total <strong>${rupiah(total)}</strong> lewat QRIS.`;
        overlay.hidden = false;
        el("confirm-pay").focus();
    };
    const createOrder = async () => {
        const habis = await DataCafe.menuHabis(items.map((i) => i.nama));
        if (habis.length) {
            alert(
                "Maaf, menu berikut sudah habis: " +
                    habis.join(", ") +
                    ". Silakan perbarui keranjang Anda."
            );
            location.href = "keranjang.html" + location.search;
            return;
        }
        const nama = el("customer-name").value.trim();
        const orderId = "CQ" + Date.now().toString().slice(-8);
        const now = new Date().toISOString();
        const order = {
            id: orderId,
            id_meja: meja || null,
            id_pelanggan: pelanggan || null,
            nama,
            items,
            subtotal,
            pajak,
            total,
            status: "Menunggu Pembayaran",
            metode: "QRIS",
            tanggal: now,
            riwayat: [{ status: "Menunggu Pembayaran", waktu: now }],
        };
        localStorage.setItem("cafeQitaOrder_" + orderId, JSON.stringify(order));
        localStorage.setItem("cafeQitaActiveOrder", orderId);
        const q = new URLSearchParams({ order_id: orderId });
        if (meja) q.set("id_meja", meja);
        if (pelanggan) q.set("id_pelanggan", pelanggan);
        location.href = "qris.html?" + q.toString();
    };
    el("continue-payment").addEventListener("click", openConfirmation);
    el("review-order").addEventListener("click", closeConfirmation);
    el("confirm-pay").addEventListener("click", createOrder);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeConfirmation();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !overlay.hidden) closeConfirmation();
    });
})();
