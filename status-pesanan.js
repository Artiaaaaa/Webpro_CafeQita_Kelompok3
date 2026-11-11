(() => {
    const el = (id) => document.getElementById(id),
        params = new URLSearchParams(location.search);
    const id = params.get("order_id") || localStorage.getItem("cafeQitaActiveOrder"),
        key = "cafeQitaOrder_" + id;
    let order = JSON.parse(localStorage.getItem(key) || "null");
    const stages = ["Menunggu Pembayaran", "Diproses", "Siap Diambil", "Selesai"];
    const rp = (n) => "Rp " + Number(n).toLocaleString("id-ID");
    if (!order) {
        el("status-title").textContent = "Pesanan tidak ditemukan";
        el("status-badge").textContent = "Tidak tersedia";
        return;
    }
    el("table-number").textContent = order.id_meja ? "Meja " + order.id_meja : "Tanpa meja";
    el("order-number").textContent = "Nomor pesanan: " + order.id;
    el("order-total").textContent = rp(order.total);
    el("items-detail").innerHTML = order.items
        .map(
            (i) =>
                `<div class="checkout-row"><span>${i.qty} × ${i.nama}</span><strong>${rp(i.harga * i.qty)}</strong></div>`
        )
        .join("");
    el("order-info").textContent = `Atas nama ${order.nama}.`;
    el("receipt-link").href = "struk.html?order_id=" + encodeURIComponent(id);
    function render() {
        el("status-badge").textContent = order.status;
        el("status-title").textContent =
            order.status === "Selesai"
                ? "Pesanan selesai!"
                : order.status === "Siap Diambil"
                  ? "Pesanan siap diambil"
                  : "Pesanan sedang diproses";
        el("status-steps").innerHTML = stages
            .map(
                (s, i) =>
                    `<div class="status-step ${stages.indexOf(order.status) >= i ? "active" : ""}"><span class="status-dot"></span><span>${s}</span></div>`
            )
            .join("");
    }
    render();

    const segarkan = () => {
        const baru = JSON.parse(localStorage.getItem(key) || "null");
        if (baru && baru.status !== order.status) {
            order = baru;
            render();
        }
    };
    window.addEventListener("storage", segarkan);
    setInterval(segarkan, 3000);
})();
