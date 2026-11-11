(() => {
    const el = (id) => document.getElementById(id),
        params = new URLSearchParams(location.search);
    const id = params.get("order_id") || localStorage.getItem("cafeQitaActiveOrder");
    const order = JSON.parse(localStorage.getItem("cafeQitaOrder_" + id) || "null");
    const rp = (n) => "Rp " + Number(n).toLocaleString("id-ID");
    if (!order) {
        el("receipt-id").textContent = "Pesanan tidak ditemukan";
        return;
    }
    el("receipt-id").textContent = order.id;
    el("receipt-date").textContent = new Date(order.tanggal).toLocaleString("id-ID");
    el("receipt-name").textContent = order.nama;
    el("receipt-table").textContent = order.id_meja ? "Meja " + order.id_meja : "-";
    el("receipt-items").innerHTML = order.items
        .map(
            (i) =>
                `<div class="receipt-line"><span>${i.qty} × ${i.nama}</span><strong>${rp(i.harga * i.qty)}</strong></div>`
        )
        .join("");
    el("receipt-subtotal").textContent = rp(order.subtotal);
    el("receipt-tax").textContent = rp(order.pajak);
    el("receipt-total").textContent = rp(order.total);
    el("receipt-payment").textContent = order.waktu_bayar
        ? "Lunas · " + order.metode
        : "Menunggu pembayaran";
    el("print-receipt").addEventListener("click", () => window.print());
})();
