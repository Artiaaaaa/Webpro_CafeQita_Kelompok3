const DataCafe = (() => {
    const K = { menu: "cafeQitaMenu", sesi: "cafeQitaSesi" };
    const AWALAN = "cafeQitaOrder_";

    const AKUN = [
        { username: "admin", password: "admin123", role: "admin", nama: "Admin Cafe Qita" },
        { username: "kasir", password: "kasir123", role: "kasir", nama: "Kasir Cafe Qita" },
    ];
    const MENU_AWAL = [
        { id: "M01", nama: "Kopi Susu", kategori: "Kopi", harga: 18000, status: "Tersedia" },
        { id: "M02", nama: "Americano", kategori: "Kopi", harga: 15000, status: "Tersedia" },
        { id: "M03", nama: "Matcha Latte", kategori: "Non-Kopi", harga: 22000, status: "Tersedia" },
        { id: "M04", nama: "Roti Bakar", kategori: "Makanan", harga: 16000, status: "Tersedia" },
        {
            id: "M05",
            nama: "Kentang Goreng",
            kategori: "Makanan",
            harga: 17000,
            status: "Tersedia",
        },
    ];

    const baca = (k, d) => {
        try {
            return JSON.parse(localStorage.getItem(k)) ?? d;
        } catch {
            return d;
        }
    };
    const tulis = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const PAJAK = 0.1;
    const jumlah = (items) => items.reduce((t, i) => t + i.harga * i.qty, 0);
    if (localStorage.getItem(K.menu) === null) tulis(K.menu, MENU_AWAL);

    const untukPortal = (o) => ({
        ...o,
        meja: o.id_meja || null,
        statusBayar: o.waktu_bayar ? "Lunas" : "Belum Lunas",
        waktu: o.waktu_bayar || o.tanggal,
    });

    return {
        KATEGORI: ["Kopi", "Non-Kopi", "Makanan"],
        PAJAK,

        async login(username, password) {
            const akun = AKUN.find((a) => a.username === username && a.password === password);
            if (!akun) return null;
            const sesi = { username: akun.username, role: akun.role, nama: akun.nama };
            sessionStorage.setItem(K.sesi, JSON.stringify(sesi));
            return sesi;
        },
        sesi(role) {
            try {
                const s = JSON.parse(sessionStorage.getItem(K.sesi));
                return s && (!role || s.role === role) ? s : null;
            } catch {
                return null;
            }
        },
        logout() {
            sessionStorage.removeItem(K.sesi);
        },

        async menu() {
            return baca(K.menu, []);
        },
        async simpanMenu(item) {
            const daftar = baca(K.menu, []);
            if (item.id) {
                const i = daftar.findIndex((m) => m.id === item.id);
                if (i >= 0) daftar[i] = { ...daftar[i], ...item };
            } else {
                const n = daftar.reduce((t, m) => Math.max(t, Number(m.id.slice(1)) || 0), 0) + 1;
                item.id = "M" + String(n).padStart(2, "0");
                daftar.push(item);
            }
            tulis(K.menu, daftar);
            return item;
        },

        async menuHabis(namaList) {
            const daftar = baca(K.menu, []);
            return namaList.filter((n) => {
                const m = daftar.find((x) => x.nama === n);
                return !m || m.status === "Habis";
            });
        },
        async hapusMenu(id) {
            tulis(
                K.menu,
                baca(K.menu, []).filter((m) => m.id !== id)
            );
        },

        async pesanan() {
            const hasil = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(AWALAN)) {
                    const o = baca(k, null);
                    if (o && o.id) hasil.push(untukPortal(o));
                }
            }
            return hasil.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
        },
        async ambilPesanan(id) {
            const o = baca(AWALAN + id, null);
            return o ? untukPortal(o) : null;
        },

        async buatPesanan({ meja = null, nama = "Pelanggan", items, metode = "Tunai" }) {
            const sekarang = new Date().toISOString(),
                sub = jumlah(items),
                pajak = Math.round(sub * PAJAK);
            const o = {
                id: "CQ" + Date.now().toString().slice(-8),
                id_meja: meja,
                id_pelanggan: null,
                nama,
                items,
                subtotal: sub,
                pajak,
                total: sub + pajak,
                status: "Diproses",
                metode,
                tanggal: sekarang,
                pembayaran: "Berhasil (" + metode + ")",
                waktu_bayar: sekarang,
                riwayat: [{ status: "Diproses", waktu: sekarang }],
            };
            tulis(AWALAN + o.id, o);
            return untukPortal(o);
        },
        async ubahPesanan(id, perubahan) {
            const o = baca(AWALAN + id, null);
            if (!o) return null;
            const { meja, statusBayar, waktu, ...sisa } = perubahan;
            if (meja !== undefined) o.id_meja = meja;
            Object.assign(o, sisa);
            if (sisa.items) {
                o.subtotal = jumlah(sisa.items);
                o.pajak = Math.round(o.subtotal * PAJAK);
                o.total = o.subtotal + o.pajak;
            }
            if (sisa.status)
                (o.riwayat = o.riwayat || []).push({
                    status: sisa.status,
                    waktu: new Date().toISOString(),
                });
            tulis(AWALAN + id, o);
            return untukPortal(o);
        },
        async hapusPesanan(id) {
            localStorage.removeItem(AWALAN + id);
        },

        pantau(fn) {
            window.addEventListener("storage", fn);
            return setInterval(fn, 3000);
        },
    };
})();
