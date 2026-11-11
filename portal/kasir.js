(async () => {
    const sesi = DataCafe.sesi("kasir");
    if (!sesi) return location.replace("login.html");

    const $ = (s) => document.querySelector(s);
    const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");
    const esc = (s) =>
        String(s).replace(
            /[&<>"']/g,
            (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
        );
    const jam = (iso) =>
        new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const kelas = {
        "Menunggu Pembayaran": "b-proses",
        Diproses: "b-proses",
        "Siap Diambil": "b-siap",
        Selesai: "b-selesai",
    };

    $("#user-nama").textContent = sesi.nama;
    $("#logout").onclick = () => {
        DataCafe.logout();
        location.href = "login.html";
    };

    const FILTER = ["Semua", "Diproses", "Siap Diambil", "Selesai"];
    let menu = [],
        pesanan = [],
        filter = "Diproses",
        editId = null,
        pilih = {};

    const cocok = (p, f) => f === "Semua" || p.status === f;

    function kartu(p) {
        let aksi = "";
        if (p.status === "Diproses")
            aksi += `<button class="btn small" data-aksi="siap" data-id="${p.id}">Siap Diambil</button>`;
        else if (p.status === "Siap Diambil")
            aksi += `<button class="btn small" data-aksi="selesai" data-id="${p.id}">Selesaikan</button>`;
        if (p.status !== "Selesai")
            aksi += `<button class="btn small soft" data-aksi="ubah" data-id="${p.id}">Ubah</button>`;
        aksi += `<button class="btn small danger" data-aksi="hapus" data-id="${p.id}">Hapus</button>`;
        return `
            <article class="order-card">
                <div class="oc-top"><strong>${esc(p.id)}</strong><span class="badge b-ok">Lunas</span></div>
                <p class="muted">${p.meja ? "Meja " + esc(p.meja) : "Tanpa meja"} · ${esc(p.nama)} · ${jam(p.waktu)} · ${esc(p.metode)}</p>
                <ul>${p.items.map((i) => `<li>${i.qty}x ${esc(i.nama)}</li>`).join("")}</ul>
                <div class="oc-total"><span>Total</span><strong>${rupiah(p.total)}</strong></div>
                <div><span class="badge ${kelas[p.status] || "b-proses"}">${esc(p.status)}</span></div>
                <div class="oc-actions">${aksi}</div>
            </article>`;
    }

    function gambar() {
        $("#filter").innerHTML = FILTER.map(
            (f) =>
                `<button class="${f === filter ? "active" : ""}" data-f="${f}">${f}<b>${pesanan.filter((p) => cocok(p, f)).length}</b></button>`
        ).join("");
        $("#judul-daftar").textContent = filter === "Semua" ? "Semua Pesanan" : "Pesanan " + filter;
        const daftar = pesanan.filter((p) => cocok(p, filter));
        $("#daftar").innerHTML = daftar.length
            ? daftar.map(kartu).join("")
            : `<p class="muted">Belum ada pesanan di sini.</p>`;
    }

    async function muat() {
        [menu, pesanan] = await Promise.all([DataCafe.menu(), DataCafe.pesanan()]);
        pesanan = pesanan.filter((p) => p.statusBayar === "Lunas");
        gambar();
    }

    $("#filter").addEventListener("click", (e) => {
        const b = e.target.closest("[data-f]");
        if (b) {
            filter = b.dataset.f;
            gambar();
        }
    });

    $("#daftar").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-aksi]");
        if (!b) return;
        const id = b.dataset.id,
            a = b.dataset.aksi;
        if (a === "ubah") return bukaModal(pesanan.find((p) => p.id === id));
        if (a === "siap") await DataCafe.ubahPesanan(id, { status: "Siap Diambil" });
        if (a === "selesai") await DataCafe.ubahPesanan(id, { status: "Selesai" });
        if (a === "hapus") {
            if (!confirm("Hapus pesanan ini?")) return;
            await DataCafe.hapusPesanan(id);
        }
        muat();
    });

    const modal = $("#modal");
    const tutup = () => modal.classList.remove("show");

    function gambarPilihan() {
        const tampil = menu.filter((m) => m.status === "Tersedia" || pilih[m.nama]);
        $("#o-menu").innerHTML = tampil
            .map(
                (m) => `
            <div class="pick"><div><strong>${esc(m.nama)}</strong><div class="muted">${rupiah(m.harga)}</div></div>
            <div class="q"><button data-q="-1" data-n="${esc(m.nama)}">−</button><span>${pilih[m.nama] || 0}</span><button data-q="1" data-n="${esc(m.nama)}">+</button></div></div>`
            )
            .join("");
        const sub = tampil.reduce((t, m) => t + m.harga * (pilih[m.nama] || 0), 0),
            pajak = Math.round(sub * DataCafe.PAJAK);
        $("#o-sub").textContent = rupiah(sub);
        $("#o-pajak").textContent = rupiah(pajak);
        $("#o-total").textContent = rupiah(sub + pajak);
    }

    function bukaModal(p) {
        editId = p ? p.id : null;
        pilih = {};
        (p ? p.items : []).forEach((i) => {
            pilih[i.nama] = i.qty;
        });
        $("#judul-modal").textContent = p ? "Ubah Pesanan" : "Pesanan Baru";
        $("#o-nama").value = p ? p.nama : "";
        $("#o-meja").value = p && p.meja ? p.meja : "";
        $("#o-metode").value = p ? p.metode : "Tunai";
        $("#o-error").hidden = true;
        gambarPilihan();
        modal.classList.add("show");
    }

    $("#tambah").onclick = () => bukaModal(null);
    $("#batal").onclick = tutup;
    modal.addEventListener("click", (e) => {
        if (e.target === modal) tutup();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") tutup();
    });
    $("#o-menu").addEventListener("click", (e) => {
        const b = e.target.closest("[data-q]");
        if (!b) return;
        const n = b.dataset.n;
        pilih[n] = Math.max(0, (pilih[n] || 0) + Number(b.dataset.q));
        gambarPilihan();
    });

    $("#simpan").onclick = async () => {
        const items = menu
            .filter((m) => pilih[m.nama] > 0)
            .map((m) => ({ nama: m.nama, harga: m.harga, qty: pilih[m.nama] }));
        if (!items.length) {
            $("#o-error").hidden = false;
            return;
        }
        const data = {
            nama: $("#o-nama").value.trim() || "Pelanggan",
            meja: $("#o-meja").value.trim() || null,
            metode: $("#o-metode").value,
            statusBayar: "Lunas",
            items,
        };
        if (editId) {
            await DataCafe.ubahPesanan(editId, data);
        } else {
            await DataCafe.buatPesanan(data);
        }
        tutup();
        muat();
    };

    await muat();
    DataCafe.pantau(muat);
})();
