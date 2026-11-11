(async () => {
    const sesi = DataCafe.sesi("admin");
    if (!sesi) return location.replace("login.html");

    const $ = (s) => document.querySelector(s);
    const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");
    const esc = (s) =>
        String(s).replace(
            /[&<>"']/g,
            (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
        );
    const waktu = (iso) =>
        new Date(iso).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
    const kelas = {
        "Menunggu Pembayaran": "b-proses",
        Diproses: "b-proses",
        "Siap Diambil": "b-siap",
        Selesai: "b-selesai",
    };

    $("#hello").textContent = "Halo, " + sesi.nama.split(" ")[0] + "!";
    $("#user-nama").textContent = sesi.nama;
    $("#m-kategori").innerHTML = DataCafe.KATEGORI.map((k) => `<option>${k}</option>`).join("");

    let menu = [],
        pesanan = [];
    const lunas = () => pesanan.filter((p) => p.statusBayar === "Lunas");

    function gambar() {
        const l = lunas();
        $("#st-menu").textContent = menu.length;
        $("#st-trx").textContent = l.length;
        $("#st-uang").textContent = rupiah(l.reduce((t, p) => t + p.total, 0));

        $("#menu-body").innerHTML =
            menu
                .map(
                    (m) => `
            <tr><td>${esc(m.id)}</td><td>${esc(m.nama)}</td><td>${esc(m.kategori)}</td><td>${rupiah(m.harga)}</td>
            <td><span class="badge ${m.status === "Tersedia" ? "b-ok" : "b-batal"}">${esc(m.status)}</span></td>
            <td class="aksi"><button class="btn small soft" data-ubah="${esc(m.id)}">Ubah</button>
            <button class="btn small danger" data-hapus="${esc(m.id)}">Hapus</button></td></tr>`
                )
                .join("") || `<tr><td colspan="6" class="muted">Belum ada menu.</td></tr>`;

        $("#trx-body").innerHTML =
            l
                .slice(0, 5)
                .map(
                    (p) => `
            <tr><td>${esc(p.id)}</td><td>${waktu(p.waktu)}</td><td>${rupiah(p.total)}</td><td>${esc(p.metode)}</td>
            <td><span class="badge ${kelas[p.status] || "b-proses"}">${esc(p.status)}</span></td></tr>`
                )
                .join("") || `<tr><td colspan="5" class="muted">Belum ada transaksi.</td></tr>`;

        laporan(l);
    }

    function laporan(l) {
        $("#lp-total").textContent = l.length;
        $("#lp-uang").textContent = rupiah(l.reduce((t, p) => t + p.total, 0));

        const jual = {};
        l.forEach((p) =>
            p.items.forEach((i) => {
                jual[i.nama] = (jual[i.nama] || 0) + i.qty;
            })
        );
        $("#lp-menu").innerHTML =
            Object.entries(jual)
                .sort((a, b) => b[1] - a[1])
                .map(([n, q]) => `<tr><td>${esc(n)}</td><td>${q}</td></tr>`)
                .join("") || `<tr><td colspan="2" class="muted">Belum ada penjualan.</td></tr>`;

        let jumlah = 0,
            uang = 0;
        const baris = ["QRIS", "Tunai"].map((m) => {
            const dp = l.filter((p) => p.metode === m),
                u = dp.reduce((t, p) => t + p.total, 0);
            jumlah += dp.length;
            uang += u;
            return `<tr><td>${m}</td><td>${dp.length}</td><td>${rupiah(u)}</td></tr>`;
        });
        $("#lp-metode").innerHTML =
            baris.join("") +
            `<tr class="total-line"><td>Total</td><td>${jumlah}</td><td>${rupiah(uang)}</td></tr>`;
    }

    async function muat() {
        [menu, pesanan] = await Promise.all([DataCafe.menu(), DataCafe.pesanan()]);
        gambar();
    }

    function tampil(v) {
        $("#view-dashboard").hidden = v !== "dashboard";
        $("#view-laporan").hidden = v !== "laporan";
        document
            .querySelectorAll(".nav [data-view]")
            .forEach((b) => b.classList.toggle("active", b.dataset.view === v));
    }
    document.addEventListener("click", (e) => {
        const b = e.target.closest("[data-view]");
        if (b) tampil(b.dataset.view);
    });
    $("#logout").onclick = () => {
        DataCafe.logout();
        location.href = "login.html";
    };

    const modal = $("#modal-menu");
    let editId = null;
    function bukaMenu(m) {
        editId = m ? m.id : null;
        $("#judul-menu").textContent = m ? "Ubah Menu" : "Tambah Menu";
        $("#m-nama").value = m ? m.nama : "";
        $("#m-kategori").value = m ? m.kategori : DataCafe.KATEGORI[0];
        $("#m-harga").value = m ? m.harga : "";
        $("#m-status").value = m ? m.status : "Tersedia";
        $("#m-error").hidden = true;
        modal.classList.add("show");
        $("#m-nama").focus();
    }
    const tutup = () => modal.classList.remove("show");
    $("#tambah-menu").onclick = () => bukaMenu(null);
    $("#batal-menu").onclick = tutup;
    modal.addEventListener("click", (e) => {
        if (e.target === modal) tutup();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") tutup();
    });

    $("#simpan-menu").onclick = async () => {
        const nama = $("#m-nama").value.trim(),
            harga = Number($("#m-harga").value);
        if (!nama || !(harga > 0)) {
            $("#m-error").hidden = false;
            return;
        }
        await DataCafe.simpanMenu({
            id: editId || undefined,
            nama,
            kategori: $("#m-kategori").value,
            harga,
            status: $("#m-status").value,
        });
        tutup();
        muat();
    };
    $("#menu-body").addEventListener("click", async (e) => {
        const u = e.target.closest("[data-ubah]"),
            h = e.target.closest("[data-hapus]");
        if (u) bukaMenu(menu.find((m) => m.id === u.dataset.ubah));
        if (h && confirm("Hapus menu ini?")) {
            await DataCafe.hapusMenu(h.dataset.hapus);
            muat();
        }
    });

    await muat();
    DataCafe.pantau(muat);
})();
