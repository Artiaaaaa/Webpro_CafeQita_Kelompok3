(() => {
    const el = (id) => document.getElementById(id),
        params = new URLSearchParams(location.search);
    const orderId = params.get("order_id") || localStorage.getItem("cafeQitaActiveOrder");
    const key = "cafeQitaOrder_" + orderId;
    let order = JSON.parse(localStorage.getItem(key) || "null");
    if (!order) {
        location.replace("menu.html");
        return;
    }
    const rp = (n) => "Rp " + Number(n).toLocaleString("id-ID");
    el("total-payment").textContent = rp(order.total);
    let deadline = Number(localStorage.getItem("cafeQitaPaymentDeadline_" + orderId) || 0);
    if (!deadline) {
        deadline = Date.now() + 10 * 60 * 1000;
        localStorage.setItem("cafeQitaPaymentDeadline_" + orderId, String(deadline));
    }
    const tick = () => {
        const left = Math.max(0, deadline - Date.now()),
            m = String(Math.floor(left / 60000)).padStart(2, "0"),
            s = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
        el("timer").textContent = m + ":" + s;
        if (left <= 0) {
            el("expired-message").hidden = false;
            el("simulate-payment").disabled = true;
            clearInterval(timer);
        }
    };
    const timer = setInterval(tick, 1000);
    tick();
    el("simulate-payment").addEventListener("click", () => {
        if (Date.now() > deadline) return;
        order.status = "Diproses";
        order.waktu_bayar = new Date().toISOString();
        order.riwayat.push({ status: "Diproses", waktu: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(order));
        const cartKey = order.id_meja
            ? `cafeQitaCart_${order.id_meja}_${order.id_pelanggan || "guest"}`
            : "cafeQitaCart_guest";
        localStorage.removeItem(cartKey);
        clearInterval(timer);
        const q = new URLSearchParams({ order_id: orderId });
        location.href = "status-pesanan.html?" + q.toString();
    });
})();
