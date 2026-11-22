import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Ukuran,
  Pabrik,
  Pihak,
  PurchaseOrder,
  POItem,
  Penerimaan,
  Barang,
  StokKelompok,
  Pengeluaran,
  PengeluaranItem,
  Pengembalian,
  PengembalianItem,
  AuditLog,
  Karyawan,
  PayrollRecord,
  UserAccount,
  OFFICIAL_ACCOUNTS,
} from '../types';

// ============================================================================
// DATA SEED AWAL (LOKAL & DEMO)
// ============================================================================

const SEED_UKURAN: Ukuran[] = [
  { id: 'u-80', kode: '80', nama: 'Kasur Busa Ukuran 80 (80×200 cm)', panjang_cm: 200, lebar_cm: 80, tebal_cm: 15, aktif: true },
  { id: 'u-90', kode: '90', nama: 'Kasur Busa Ukuran 90 Single (90×200 cm)', panjang_cm: 200, lebar_cm: 90, tebal_cm: 15, aktif: true },
  { id: 'u-100', kode: '100', nama: 'Kasur Busa Ukuran 100 (100×200 cm)', panjang_cm: 200, lebar_cm: 100, tebal_cm: 15, aktif: true },
  { id: 'u-120', kode: '120', nama: 'Kasur Busa Ukuran 120 Super Single (120×200 cm)', panjang_cm: 200, lebar_cm: 120, tebal_cm: 15, aktif: true },
  { id: 'u-140', kode: '140', nama: 'Kasur Busa Ukuran 140 Double (140×200 cm)', panjang_cm: 200, lebar_cm: 140, tebal_cm: 20, aktif: true },
  { id: 'u-160', kode: '160', nama: 'Kasur Busa Ukuran 160 Queen (160×200 cm)', panjang_cm: 200, lebar_cm: 160, tebal_cm: 20, aktif: true },
  { id: 'u-200', kode: '200', nama: 'Kasur Busa Ukuran 200 King (200×200 cm)', panjang_cm: 200, lebar_cm: 200, tebal_cm: 20, aktif: true },
];

const SEED_PABRIK: Pabrik[] = [
  { id: 'p-1', nama: 'UMKM Comet', kontak: '0812-3456-7890 (Bpk. Comet)', alamat: 'Sentra Industri Kasur Busa UMKM Comet', aktif: true },
  { id: 'p-2', nama: 'CV Foam Perkasa Abadi', kontak: '0813-9876-5432 (Ibu Maya)', alamat: 'Jl. Raya Industri Km 18, Tangerang', aktif: true },
];

const SEED_PIHAK: Pihak[] = [
  { id: 'ph-1', nama: 'Rendy Handsome', telepon: '0821-1122-3344', tipe: 'pengirim', aktif: true },
  { id: 'ph-2', nama: 'Muji Keren', telepon: '0821-5566-7788', tipe: 'pengirim', aktif: true },
  { id: 'ph-3', nama: 'Dedi Kurniawan (Driver Pikap)', telepon: '0821-9988-7766', tipe: 'pengirim', aktif: true },
  { id: 'ph-4', nama: 'Fajar Ramadhan (Koord Barat)', telepon: '0815-1234-5678', tipe: 'koordinator', aktif: true },
  { id: 'ph-5', nama: 'Rian Hidayat (Koord Timur)', telepon: '0815-8765-4321', tipe: 'koordinator', aktif: true },
  { id: 'ph-6', nama: 'Toko Mebel Sentosa Jaya', telepon: '0819-2233-4455', tipe: 'pembeli', aktif: true },
  { id: 'ph-7', nama: 'Ibu Ratna (Perum Graha Asri)', telepon: '0857-4455-6677', tipe: 'pembeli', aktif: true },
];

const SEED_POS: PurchaseOrder[] = [];

const SEED_PENERIMAAN: Penerimaan[] = [];

function generateSeedBarang(): Barang[] {
  return [];
}

const SEED_KARYAWAN: Karyawan[] = [];

const SEED_PAYROLL: PayrollRecord[] = [];

// ============================================================================
// LOCAL STORAGE ENGINE UNTUK DEMO & TESTING TANPA KONEKSI SUPABASE
// ============================================================================

const STORAGE_KEYS = {
  UKURAN: 'kb_ukuran',
  PABRIK: 'kb_pabrik',
  PIHAK: 'kb_pihak',
  PO: 'kb_purchase_order',
  PENERIMAAN: 'kb_penerimaan',
  BARANG: 'kb_barang',
  PENGELUARAN: 'kb_pengeluaran',
  PENGELUARAN_ITEM: 'kb_pengeluaran_item',
  RETUR: 'kb_retur',
  RETUR_SEQ: 'kb_retur_seq',
  AUDIT: 'kb_audit_log',
  SJ_SEQ: 'kb_sj_seq',
  KARYAWAN: 'kb_karyawan',
  PAYROLL: 'kb_payroll',
  PAYROLL_SEQ: 'kb_payroll_seq',
  AUTH_USER: 'kb_auth_user',
};

function getLocalData<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setLocalData<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(val));
}

const PROD_CLEAN_VERSION = 'kb_clean_prod_v20261121';

export function resetTransactionAndKaryawanData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.PO);
  localStorage.removeItem(STORAGE_KEYS.PENERIMAAN);
  localStorage.removeItem(STORAGE_KEYS.BARANG);
  localStorage.removeItem(STORAGE_KEYS.PENGELUARAN);
  localStorage.removeItem(STORAGE_KEYS.PENGELUARAN_ITEM);
  localStorage.removeItem(STORAGE_KEYS.RETUR);
  localStorage.removeItem(STORAGE_KEYS.RETUR_SEQ);
  localStorage.removeItem(STORAGE_KEYS.SJ_SEQ);
  localStorage.removeItem(STORAGE_KEYS.AUDIT);
  localStorage.removeItem(STORAGE_KEYS.KARYAWAN);
  localStorage.removeItem(STORAGE_KEYS.PAYROLL);
  localStorage.removeItem(STORAGE_KEYS.PAYROLL_SEQ);
}

// Initialize seed data if empty
export function initLocalSeedData(forceReset = false) {
  if (typeof window !== 'undefined') {
    const hasCleaned = localStorage.getItem(PROD_CLEAN_VERSION);
    if (!hasCleaned || forceReset) {
      resetTransactionAndKaryawanData();
      localStorage.setItem(PROD_CLEAN_VERSION, 'true');
    }
  }

  const existingUkuran = getLocalData<Ukuran[]>(STORAGE_KEYS.UKURAN, SEED_UKURAN);
  let ukuranChanged = false;
  SEED_UKURAN.forEach(seedU => {
    if (!existingUkuran.some(u => u.kode === seedU.kode)) {
      existingUkuran.push(seedU);
      ukuranChanged = true;
    }
  });
  if (ukuranChanged) setLocalData(STORAGE_KEYS.UKURAN, existingUkuran);
  
  // Pastikan nama pabrik termutakhir (UMKM Comet)
  const existingPabrik = getLocalData<Pabrik[]>(STORAGE_KEYS.PABRIK, SEED_PABRIK);
  if (existingPabrik && existingPabrik.length > 0) {
    let changed = false;
    existingPabrik.forEach(p => {
      if (p.id === 'p-1' && p.nama !== 'UMKM Comet') {
        p.nama = 'UMKM Comet';
        changed = true;
      }
    });
    if (changed) setLocalData(STORAGE_KEYS.PABRIK, existingPabrik);
  }

  // Pastikan nama pengirim termutakhir (Rendy Handsome & Muji Keren)
  const existingPihak = getLocalData<Pihak[]>(STORAGE_KEYS.PIHAK, SEED_PIHAK);
  if (existingPihak && existingPihak.length > 0) {
    let changed = false;
    existingPihak.forEach(p => {
      if (p.id === 'ph-1' && p.nama !== 'Rendy Handsome') {
        p.nama = 'Rendy Handsome';
        changed = true;
      }
      if (p.id === 'ph-2' && p.nama !== 'Muji Keren') {
        p.nama = 'Muji Keren';
        changed = true;
      }
    });
    if (changed) setLocalData(STORAGE_KEYS.PIHAK, existingPihak);
  }

  getLocalData(STORAGE_KEYS.PO, [] as PurchaseOrder[]);
  getLocalData(STORAGE_KEYS.PENERIMAAN, [] as Penerimaan[]);
  getLocalData(STORAGE_KEYS.BARANG, [] as Barang[]);
  getLocalData(STORAGE_KEYS.PENGELUARAN, [] as Pengeluaran[]);
  getLocalData(STORAGE_KEYS.PENGELUARAN_ITEM, [] as PengeluaranItem[]);
  getLocalData(STORAGE_KEYS.RETUR, [] as Pengembalian[]);
  getLocalData(STORAGE_KEYS.AUDIT, [] as AuditLog[]);
  getLocalData(STORAGE_KEYS.KARYAWAN, [] as Karyawan[]);
  getLocalData(STORAGE_KEYS.PAYROLL, [] as PayrollRecord[]);
}

initLocalSeedData();

// Helper untuk log audit lokal
function addLocalAudit(aksi: string, tabel: string, record_id: string, data_sesudah: any, user = 'Admin') {
  const audits = getLocalData<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
  const newAudit: AuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_email: user,
    aksi,
    tabel,
    record_id,
    data_sesudah,
    waktu: new Date().toISOString(),
  };
  audits.unshift(newAudit);
  setLocalData(STORAGE_KEYS.AUDIT, audits);
}

// ============================================================================
// SERVICE API METHODS
// ============================================================================

export const api = {
  // --------------------------------------------------------------------------
  // MASTER DATA: UKURAN
  // --------------------------------------------------------------------------
  async getUkuran(): Promise<Ukuran[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('ukuran').select('*').order('panjang_cm', { ascending: false });
      if (!error && data) return data;
    }
    return getLocalData<Ukuran[]>(STORAGE_KEYS.UKURAN, SEED_UKURAN);
  },

  async getUkuranList(): Promise<Ukuran[]> {
    return this.getUkuran();
  },

  async saveUkuran(item: Partial<Ukuran>): Promise<Ukuran> {
    if (isSupabaseConfigured && supabase) {
      if (item.id && !item.id.startsWith('u-')) {
        const { data, error } = await supabase.from('ukuran').update(item).eq('id', item.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('ukuran').insert([item]).select().single();
        if (error) throw error;
        return data;
      }
    }

    const list = getLocalData<Ukuran[]>(STORAGE_KEYS.UKURAN, SEED_UKURAN);
    if (item.id) {
      const idx = list.findIndex(u => u.id === item.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item, updated_at: new Date().toISOString() };
        setLocalData(STORAGE_KEYS.UKURAN, list);
        addLocalAudit('UPDATE', 'ukuran', item.id, item);
        return list[idx];
      }
    }
    const newItem: Ukuran = {
      id: `u-${Date.now()}`,
      kode: item.kode || '',
      nama: item.nama || '',
      panjang_cm: item.panjang_cm || 200,
      lebar_cm: item.lebar_cm || 100,
      tebal_cm: item.tebal_cm,
      aktif: item.aktif ?? true,
      created_at: new Date().toISOString(),
    };
    list.push(newItem);
    setLocalData(STORAGE_KEYS.UKURAN, list);
    addLocalAudit('CREATE', 'ukuran', newItem.id, newItem);
    return newItem;
  },

  // --------------------------------------------------------------------------
  // MASTER DATA: PABRIK
  // --------------------------------------------------------------------------
  async getPabrik(): Promise<Pabrik[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('pabrik').select('*').order('nama', { ascending: true });
      if (!error && data) return data;
    }
    return getLocalData<Pabrik[]>(STORAGE_KEYS.PABRIK, SEED_PABRIK);
  },

  async savePabrik(item: Partial<Pabrik>): Promise<Pabrik> {
    if (isSupabaseConfigured && supabase) {
      if (item.id && !item.id.startsWith('p-')) {
        const { data, error } = await supabase.from('pabrik').update(item).eq('id', item.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('pabrik').insert([item]).select().single();
        if (error) throw error;
        return data;
      }
    }

    const list = getLocalData<Pabrik[]>(STORAGE_KEYS.PABRIK, SEED_PABRIK);
    if (item.id) {
      const idx = list.findIndex(p => p.id === item.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item, updated_at: new Date().toISOString() };
        setLocalData(STORAGE_KEYS.PABRIK, list);
        addLocalAudit('UPDATE', 'pabrik', item.id, item);
        return list[idx];
      }
    }
    const newItem: Pabrik = {
      id: `p-${Date.now()}`,
      nama: item.nama || '',
      kontak: item.kontak || '',
      alamat: item.alamat || '',
      aktif: item.aktif ?? true,
      created_at: new Date().toISOString(),
    };
    list.push(newItem);
    setLocalData(STORAGE_KEYS.PABRIK, list);
    addLocalAudit('CREATE', 'pabrik', newItem.id, newItem);
    return newItem;
  },

  // --------------------------------------------------------------------------
  // MASTER DATA: PIHAK (Pengirim, Koordinator, Pembeli)
  // --------------------------------------------------------------------------
  async getPihak(tipe?: string): Promise<Pihak[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('pihak').select('*').order('nama', { ascending: true });
      if (tipe) query = query.eq('tipe', tipe);
      const { data, error } = await query;
      if (!error && data) return data;
    }
    const all = getLocalData<Pihak[]>(STORAGE_KEYS.PIHAK, SEED_PIHAK);
    return tipe ? all.filter(p => p.tipe === tipe) : all;
  },

  async savePihak(item: Partial<Pihak>): Promise<Pihak> {
    if (isSupabaseConfigured && supabase) {
      if (item.id && !item.id.startsWith('ph-')) {
        const { data, error } = await supabase.from('pihak').update(item).eq('id', item.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('pihak').insert([item]).select().single();
        if (error) throw error;
        return data;
      }
    }

    const list = getLocalData<Pihak[]>(STORAGE_KEYS.PIHAK, SEED_PIHAK);
    if (item.id) {
      const idx = list.findIndex(p => p.id === item.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item, updated_at: new Date().toISOString() };
        setLocalData(STORAGE_KEYS.PIHAK, list);
        addLocalAudit('UPDATE', 'pihak', item.id, item);
        return list[idx];
      }
    }
    const newItem: Pihak = {
      id: `ph-${Date.now()}`,
      nama: item.nama || '',
      telepon: item.telepon || '',
      tipe: item.tipe || 'pembeli',
      aktif: item.aktif ?? true,
      created_at: new Date().toISOString(),
    };
    list.push(newItem);
    setLocalData(STORAGE_KEYS.PIHAK, list);
    addLocalAudit('CREATE', 'pihak', newItem.id, newItem);
    return newItem;
  },

  // --------------------------------------------------------------------------
  // PURCHASE ORDER (PO) & ITEMS
  // --------------------------------------------------------------------------
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const pabriks = await this.getPabrik();
    const ukurans = await this.getUkuran();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('purchase_order')
        .select(`
          *,
          pabrik:pabrik(*),
          items:po_item(*, ukuran:ukuran(*))
        `)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }

    const pos = getLocalData<PurchaseOrder[]>(STORAGE_KEYS.PO, SEED_POS);
    // Enrich with pabrik and ukuran relations
    return pos.map(po => ({
      ...po,
      pabrik: pabriks.find(p => p.id === po.pabrik_id),
      items: po.items?.map(it => ({
        ...it,
        ukuran: ukurans.find(u => u.id === it.ukuran_id),
      })) || [],
    }));
  },

  async createPurchaseOrder(
    poData: { pabrik_id: string; tanggal_pesan: string; catatan?: string; dibuat_oleh?: string },
    items: { ukuran_id: string; qty_pesan: number }[]
  ): Promise<PurchaseOrder> {
    const noPo = `PO-${poData.tanggal_pesan.replace(/-/g, '').slice(0, 6)}-${Math.floor(100 + Math.random() * 900)}`;

    if (isSupabaseConfigured && supabase) {
      const { data: po, error: poErr } = await supabase
        .from('purchase_order')
        .insert([{
          no_po: noPo,
          pabrik_id: poData.pabrik_id,
          tanggal_pesan: poData.tanggal_pesan,
          status: 'dipesan',
          catatan: poData.catatan,
          dibuat_oleh: poData.dibuat_oleh || 'Admin',
        }])
        .select()
        .single();
      if (poErr) throw poErr;

      const itemsToInsert = items.map(it => ({
        po_id: po.id,
        ukuran_id: it.ukuran_id,
        qty_pesan: it.qty_pesan,
        qty_diterima: 0,
      }));

      const { error: itErr } = await supabase.from('po_item').insert(itemsToInsert);
      if (itErr) throw itErr;

      return po;
    }

    const pos = getLocalData<PurchaseOrder[]>(STORAGE_KEYS.PO, SEED_POS);
    const poId = `po-${Date.now()}`;
    const newItems: POItem[] = items.map((it, idx) => ({
      id: `poi-${Date.now()}-${idx}`,
      po_id: poId,
      ukuran_id: it.ukuran_id,
      qty_pesan: it.qty_pesan,
      qty_diterima: 0,
    }));

    const newPO: PurchaseOrder = {
      id: poId,
      no_po: noPo,
      pabrik_id: poData.pabrik_id,
      tanggal_pesan: poData.tanggal_pesan,
      status: 'dipesan',
      catatan: poData.catatan,
      dibuat_oleh: poData.dibuat_oleh || 'Admin',
      items: newItems,
      created_at: new Date().toISOString(),
    };

    pos.unshift(newPO);
    setLocalData(STORAGE_KEYS.PO, pos);
    addLocalAudit('CREATE', 'purchase_order', newPO.id, newPO);
    return newPO;
  },

  // --------------------------------------------------------------------------
  // PENERIMAAN BARANG & GENERATE BARCODE
  // Format Barcode: {UKURAN}-{DDMMYY}
  // --------------------------------------------------------------------------
  async terimaBarangBatch(
    poId: string | undefined,
    penerima: string,
    catatan: string,
    tanggalTerima: string, // YYYY-MM-DD
    itemsReceived: {
      po_item_id?: string;
      ukuran_id?: string;
      kode_ukuran: string;
      nama_ukuran?: string;
      panjang_cm?: number;
      lebar_cm?: number;
      tebal_cm?: number;
      qty: number;
    }[],
    pabrikNama: string = 'UMKM Comet',
    tanggalPo?: string
  ): Promise<{
    penerimaan_id: string;
    total_pcs: number;
    barcodes: { barcode: string; kode_ukuran: string; qty: number; nama_ukuran?: string }[];
  }> {
    // Format DDMMYY untuk tanggal PO pembentuk barcode (mis. 2026-10-10 -> 101026)
    const tglForBarcode = tanggalPo || tanggalTerima;
    const [year, month, day] = tglForBarcode.split('-');
    const dateCode = `${day}${month}${year.slice(-2)}`;

    if (isSupabaseConfigured && supabase && poId) {
      const { data, error } = await supabase.rpc('terima_barang_batch', {
        p_po_id: poId,
        p_penerima: penerima,
        p_catatan: catatan,
        p_tanggal_terima: tanggalTerima,
        p_items: itemsReceived,
      });
      if (!error && data) return data;
    }

    // Engine Penerimaan Lokal (Mendukung Penerimaan Bebas Ukuran apa saja maupun terkait PO)
    const pos = getLocalData<PurchaseOrder[]>(STORAGE_KEYS.PO, SEED_POS);
    const po = poId ? pos.find(p => p.id === poId) : undefined;
    const allUkurans = getLocalData<Ukuran[]>(STORAGE_KEYS.UKURAN, SEED_UKURAN);
    const penerimaanList = getLocalData<Penerimaan[]>(STORAGE_KEYS.PENERIMAAN, SEED_PENERIMAAN);
    const barangs = getLocalData<Barang[]>(STORAGE_KEYS.BARANG, []);

    const penerimaanId = `rcv-${Date.now()}`;
    let totalPcs = 0;
    const barcodesCreated: { barcode: string; kode_ukuran: string; qty: number; nama_ukuran?: string }[] = [];

    for (const it of itemsReceived) {
      if (it.qty <= 0) continue;
      const barcode = `${it.kode_ukuran}-${dateCode}`;
      totalPcs += it.qty;

      // Pastikan ukuran terdaftar di master ukuran (termasuk ukuran custom)
      let u = allUkurans.find(uk => uk.kode.toLowerCase() === it.kode_ukuran.toLowerCase() || uk.id === it.ukuran_id);
      if (!u) {
        let panjang = it.panjang_cm || 200;
        let lebar = it.lebar_cm || 100;
        const matchDim = it.kode_ukuran.match(/(\d+)[Xx](\d+)/);
        if (matchDim) {
          lebar = parseInt(matchDim[1], 10);
          panjang = parseInt(matchDim[2], 10);
        } else {
          const num = parseInt(it.kode_ukuran, 10);
          if (!isNaN(num)) lebar = num;
        }

        u = {
          id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          kode: it.kode_ukuran,
          nama: it.nama_ukuran || `Kasur Busa Custom (${it.kode_ukuran})`,
          panjang_cm: panjang,
          lebar_cm: lebar,
          tebal_cm: it.tebal_cm || 20,
          aktif: true,
          created_at: new Date().toISOString(),
        };
        allUkurans.push(u);
        setLocalData(STORAGE_KEYS.UKURAN, allUkurans);
      }

      barcodesCreated.push({
        barcode,
        kode_ukuran: it.kode_ukuran,
        nama_ukuran: u.nama,
        qty: it.qty,
      });

      // Update PO item qty_diterima jika ada PO terkait
      if (po && po.items) {
        const itemIdx = po.items.findIndex(p => p.id === it.po_item_id || p.ukuran_id === u?.id);
        if (itemIdx >= 0) {
          po.items[itemIdx].qty_diterima += it.qty;
        }
      }

      // Generate N rows di tabel barang (1 record per pcs)
      for (let i = 0; i < it.qty; i++) {
        barangs.push({
          id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          barcode,
          ukuran_id: u.id,
          po_item_id: it.po_item_id,
          penerimaan_id: penerimaanId,
          tanggal_masuk: tanggalTerima,
          status: 'di_gudang',
          created_at: new Date().toISOString(),
        });
      }
    }

    if (po) {
      const hasRemaining = po.items?.some(it => it.qty_diterima < it.qty_pesan);
      po.status = hasRemaining ? 'sebagian_datang' : 'selesai';
      po.updated_at = new Date().toISOString();
      setLocalData(STORAGE_KEYS.PO, pos);
    }

    // Simpan penerimaan
    penerimaanList.unshift({
      id: penerimaanId,
      po_id: po?.id,
      tanggal_po: tanggalPo || tanggalTerima,
      tanggal_terima: tanggalTerima,
      penerima,
      pabrik_nama: pabrikNama || po?.pabrik?.nama || 'UMKM Comet',
      catatan,
      created_at: new Date().toISOString(),
      total_pcs: totalPcs,
      barcodes: barcodesCreated,
    });

    setLocalData(STORAGE_KEYS.PENERIMAAN, penerimaanList);
    setLocalData(STORAGE_KEYS.BARANG, barangs);

    addLocalAudit('TERIMA_BARANG', 'penerimaan', penerimaanId, {
      po_id: po?.id,
      pabrik_nama: pabrikNama,
      penerima,
      total_pcs: totalPcs,
      barcodes: barcodesCreated,
    });

    return {
      penerimaan_id: penerimaanId,
      total_pcs: totalPcs,
      barcodes: barcodesCreated,
    };
  },

  async getPenerimaanList(): Promise<Penerimaan[]> {
    const pos = await this.getPurchaseOrders();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('penerimaan')
        .select(`*, po:purchase_order(*, pabrik:pabrik(*))`)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }

    const list = getLocalData<Penerimaan[]>(STORAGE_KEYS.PENERIMAAN, SEED_PENERIMAAN);
    return list.map(rcv => ({
      ...rcv,
      po: pos.find(p => p.id === rcv.po_id),
    }));
  },

  // --------------------------------------------------------------------------
  // STOK GUDANG & VIEW KELOMPOK BARCODE
  // --------------------------------------------------------------------------
  async getStokKelompok(): Promise<StokKelompok[]> {
    const ukurans = await this.getUkuran();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('stok_kelompok').select('*');
      if (!error && data) return data;
    }

    const barangs = getLocalData<Barang[]>(STORAGE_KEYS.BARANG, []);
    const map = new Map<string, StokKelompok>();

    for (const b of barangs) {
      const key = `${b.barcode}_${b.tanggal_masuk}`;
      if (!map.has(key)) {
        const u = ukurans.find(item => item.id === b.ukuran_id);
        map.set(key, {
          barcode: b.barcode,
          ukuran_id: b.ukuran_id,
          kode_ukuran: u?.kode || b.barcode.split('-')[0],
          nama_ukuran: u?.nama || `Ukuran ${b.barcode.split('-')[0]}`,
          panjang_cm: u?.panjang_cm,
          lebar_cm: u?.lebar_cm,
          tebal_cm: u?.tebal_cm,
          tanggal_masuk: b.tanggal_masuk,
          jumlah_masuk: 0,
          sisa_di_gudang: 0,
          jumlah_keluar: 0,
          jumlah_rusak: 0,
          pertama_masuk: b.created_at,
          terakhir_masuk: b.created_at,
        });
      }

      const item = map.get(key)!;
      item.jumlah_masuk += 1;
      if (b.status === 'di_gudang') item.sisa_di_gudang += 1;
      else if (b.status === 'keluar') item.jumlah_keluar += 1;
      else if (b.status === 'rusak') item.jumlah_rusak += 1;
    }

    return Array.from(map.values()).sort((a, b) => b.tanggal_masuk.localeCompare(a.tanggal_masuk));
  },

  // Trace riwayat lengkap satu kelompok barcode
  async getBarcodeDetail(barcode: string): Promise<{
    kelompok: StokKelompok | null;
    items: Barang[];
    penerimaan?: Penerimaan;
    po?: PurchaseOrder;
    pengeluarans: {
      pengeluaran: Pengeluaran;
      pcs_count: number;
    }[];
  }> {
    const kelompokList = await this.getStokKelompok();
    const kelompok = kelompokList.find(k => k.barcode === barcode) || null;
    const barangs = getLocalData<Barang[]>(STORAGE_KEYS.BARANG, []).filter(b => b.barcode === barcode);
    const penerimaanList = await this.getPenerimaanList();
    const pos = await this.getPurchaseOrders();

    const firstItem = barangs[0];
    const penerimaan = firstItem ? penerimaanList.find(p => p.id === firstItem.penerimaan_id) : undefined;
    const po = penerimaan ? pos.find(p => p.id === penerimaan.po_id) : undefined;

    // Cari riwayat pengeluaran yang menyertakan barang dari barcode ini
    const allPengeluaran = await this.getPengeluaranList();
    const pengeluaranMap = new Map<string, { pengeluaran: Pengeluaran; pcs_count: number }>();

    for (const peng of allPengeluaran) {
      if (!peng.items) continue;
      const count = peng.items.filter(it => it.barcode_scan === barcode && !it.is_batal).length;
      if (count > 0) {
        pengeluaranMap.set(peng.id, {
          pengeluaran: peng,
          pcs_count: count,
        });
      }
    }

    return {
      kelompok,
      items: barangs,
      penerimaan,
      po,
      pengeluarans: Array.from(pengeluaranMap.values()),
    };
  },

  // --------------------------------------------------------------------------
  // BARANG KELUAR & SIMPAN PENGELUARAN (FIFO DEDUCTION & SURAT JALAN)
  // --------------------------------------------------------------------------
  async simpanPengeluaran(
    data: {
      pengirim_id?: string;
      koordinator_id?: string;
      koordinator_nama?: string;
      pembeli_id?: string;
      pembeli_nama: string;
      keterangan?: string;
      scans: (string | { barcode: string; pembeli_nama?: string })[]; // array barcode per pcs (bisa string atau object dengan nama pembeli)
      dibuat_oleh?: string;
    }
  ): Promise<{
    pengeluaran_id: string;
    no_surat_jalan: string;
    total_pcs: number;
    pengeluaran: Pengeluaran;
  }> {
    if (data.scans.length === 0) {
      throw new Error('Tidak ada barang yang di-scan');
    }

    const scanEntries: { barcode: string; pembeli_nama?: string }[] = data.scans.map(s =>
      typeof s === 'string'
        ? { barcode: s, pembeli_nama: data.pembeli_nama }
        : { barcode: s.barcode, pembeli_nama: s.pembeli_nama || data.pembeli_nama }
    );

    if (isSupabaseConfigured && supabase) {
      const { data: res, error } = await supabase.rpc('simpan_pengeluaran', {
        p_pengirim_id: data.pengirim_id || null,
        p_koordinator_id: data.koordinator_id || null,
        p_koordinator_nama: data.koordinator_nama || null,
        p_pembeli_id: data.pembeli_id || null,
        p_pembeli_nama: data.pembeli_nama,
        p_keterangan: data.keterangan || '',
        p_barcodes: scanEntries.map(e => e.barcode),
        p_dibuat_oleh: data.dibuat_oleh || 'Admin',
        p_buyer_names: scanEntries.map(e => e.pembeli_nama || data.pembeli_nama),
      });
      if (error) throw error;
      const pengeluaran = await this.getPengeluaranById(res.pengeluaran_id);
      return {
        ...res,
        pengeluaran: pengeluaran!,
      };
    }

    // Engine Pengeluaran Lokal (FIFO & Atomic validation)
    const barangs = getLocalData<Barang[]>(STORAGE_KEYS.BARANG, []);
    const allocatedBarangIds: string[] = [];
    const pengeluaranItems: PengeluaranItem[] = [];

    // Validasi ketersediaan stok untuk semua scan (FIFO: ambil yang paling lama masuk dulu)
    for (const entry of scanEntries) {
      const barcode = entry.barcode;
      const availablePcs = barangs
        .filter(b => b.barcode === barcode && b.status === 'di_gudang' && !allocatedBarangIds.includes(b.id))
        .sort((a, b) => a.tanggal_masuk.localeCompare(b.tanggal_masuk) || (a.created_at || '').localeCompare(b.created_at || ''));

      if (availablePcs.length === 0) {
        throw new Error(`Stok untuk barcode "${barcode}" sudah habis atau tidak mencukupi!`);
      }

      const selected = availablePcs[0];
      allocatedBarangIds.push(selected.id);
      selected.status = 'keluar';
      selected.updated_at = new Date().toISOString();

      pengeluaranItems.push({
        id: `pitm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        pengeluaran_id: '',
        barang_id: selected.id,
        barcode_scan: barcode,
        pembeli_nama: entry.pembeli_nama || data.pembeli_nama,
        waktu_scan: new Date().toISOString(),
        is_batal: false,
        barang: selected,
      });
    }

    // Nomor Surat Jalan: SJ-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    let seq = getLocalData<number>(STORAGE_KEYS.SJ_SEQ, 1);
    const noSj = `SJ-${dateStr}-${String(seq).padStart(4, '0')}`;
    setLocalData(STORAGE_KEYS.SJ_SEQ, seq + 1);

    const pengeluaranId = `peng-${Date.now()}`;
    pengeluaranItems.forEach(it => (it.pengeluaran_id = pengeluaranId));

    const pengeluaranList = getLocalData<Pengeluaran[]>(STORAGE_KEYS.PENGELUARAN, []);
    const allPihak = getLocalData<Pihak[]>(STORAGE_KEYS.PIHAK, SEED_PIHAK);

    const finalKoordNama = data.koordinator_nama || (allPihak.find(p => p.id === data.koordinator_id)?.nama) || '';
    const distinctItemBuyers = Array.from(new Set(scanEntries.map(s => s.pembeli_nama?.trim()).filter(Boolean)));
    const finalPembeliNama = data.pembeli_nama?.trim() || (distinctItemBuyers.length > 0 ? distinctItemBuyers.join(', ') : 'Banyak Pembeli');

    const newPengeluaran: Pengeluaran = {
      id: pengeluaranId,
      no_surat_jalan: noSj,
      tanggal: new Date().toISOString(),
      pengirim_id: data.pengirim_id,
      koordinator_id: data.koordinator_id,
      koordinator_nama: finalKoordNama,
      pembeli_id: data.pembeli_id,
      pembeli_nama: finalPembeliNama,
      keterangan: data.keterangan,
      status: 'aktif',
      dibuat_oleh: data.dibuat_oleh || 'Admin',
      items: pengeluaranItems,
      pengirim: allPihak.find(p => p.id === data.pengirim_id),
      koordinator: allPihak.find(p => p.id === data.koordinator_id) || (finalKoordNama ? { id: 'custom', nama: finalKoordNama, telepon: '', tipe: 'koordinator', aktif: true } : undefined),
      pembeli: allPihak.find(p => p.id === data.pembeli_id),
      created_at: new Date().toISOString(),
    };

    pengeluaranList.unshift(newPengeluaran);
    const allPengItems = getLocalData<PengeluaranItem[]>(STORAGE_KEYS.PENGELUARAN_ITEM, []);
    allPengItems.push(...pengeluaranItems);

    setLocalData(STORAGE_KEYS.PENGELUARAN, pengeluaranList);
    setLocalData(STORAGE_KEYS.PENGELUARAN_ITEM, allPengItems);
    setLocalData(STORAGE_KEYS.BARANG, barangs);

    addLocalAudit('SIMPAN_PENGELUARAN', 'pengeluaran', pengeluaranId, {
      no_surat_jalan: noSj,
      pembeli_nama: data.pembeli_nama,
      total_pcs: data.scans.length,
      dibuat_oleh: data.dibuat_oleh || 'Admin',
    });

    return {
      pengeluaran_id: pengeluaranId,
      no_surat_jalan: noSj,
      total_pcs: data.scans.length,
      pengeluaran: newPengeluaran,
    };
  },

  async batalkanPengeluaran(pengeluaranId: string, alasan: string, user = 'Admin'): Promise<void> {
    if (!alasan || alasan.trim().length < 3) {
      throw new Error('Alasan pembatalan wajib diisi (minimal 3 karakter)');
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('batalkan_pengeluaran', {
        p_pengeluaran_id: pengeluaranId,
        p_alasan: alasan,
        p_user: user,
      });
      if (error) throw error;
      return;
    }

    const pengeluaranList = getLocalData<Pengeluaran[]>(STORAGE_KEYS.PENGELUARAN, []);
    const idx = pengeluaranList.findIndex(p => p.id === pengeluaranId);
    if (idx < 0) throw new Error('Transaksi pengeluaran tidak ditemukan');

    const pengeluaran = pengeluaranList[idx];
    if (pengeluaran.status === 'batal') throw new Error('Transaksi ini sudah dibatalkan sebelumnya');

    const barangs = getLocalData<Barang[]>(STORAGE_KEYS.BARANG, []);
    const items = pengeluaran.items || [];

    // Kembalikan barang ke status di_gudang
    for (const it of items) {
      const bIndex = barangs.findIndex(b => b.id === it.barang_id);
      if (bIndex >= 0) {
        barangs[bIndex].status = 'di_gudang';
        barangs[bIndex].updated_at = new Date().toISOString();
      }
      it.is_batal = true;
    }

    pengeluaran.status = 'batal';
    pengeluaran.alasan_batal = alasan;
    pengeluaran.updated_at = new Date().toISOString();
    pengeluaranList[idx] = pengeluaran;

    setLocalData(STORAGE_KEYS.PENGELUARAN, pengeluaranList);
    setLocalData(STORAGE_KEYS.BARANG, barangs);

    addLocalAudit('BATALKAN_PENGELUARAN', 'pengeluaran', pengeluaranId, {
      no_surat_jalan: pengeluaran.no_surat_jalan,
      alasan,
      restored_pcs: items.length,
      dibatalkan_oleh: user,
    });
  },

  async getPengeluaranList(): Promise<Pengeluaran[]> {
    const allPihak = await this.getPihak();
    const ukurans = await this.getUkuran();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('pengeluaran')
        .select(`
          *,
          pengirim:pihak!pengirim_id(*),
          koordinator:pihak!koordinator_id(*),
          pembeli:pihak!pembeli_id(*),
          items:pengeluaran_item(*, barang:barang(*, ukuran:ukuran(*)))
        `)
        .order('tanggal', { ascending: false });
      if (!error && data) return data;
    }

    const list = getLocalData<Pengeluaran[]>(STORAGE_KEYS.PENGELUARAN, []);
    return list.map(p => ({
      ...p,
      pengirim: allPihak.find(ph => ph.id === p.pengirim_id),
      koordinator: allPihak.find(ph => ph.id === p.koordinator_id) || (p.koordinator_nama ? { id: 'custom', nama: p.koordinator_nama, telepon: '', tipe: 'koordinator', aktif: true } : undefined),
      pembeli: allPihak.find(ph => ph.id === p.pembeli_id),
      items: p.items?.map(it => {
        const u = it.barang?.ukuran_id ? ukurans.find(uk => uk.id === it.barang?.ukuran_id) : undefined;
        return {
          ...it,
          barang: it.barang ? { ...it.barang, ukuran: u } : undefined,
        };
      }),
    }));
  },

  async getPengeluaranById(id: string): Promise<Pengeluaran | null> {
    const list = await this.getPengeluaranList();
    return list.find(p => p.id === id) || null;
  },

  // --------------------------------------------------------------------------
  // PENGEMBALIAN BARANG (RETUR BATAL BELI -> MASUK STOK LAGI)
  // --------------------------------------------------------------------------
  async simpanPengembalian(data: {
    pembeli_nama: string;
    no_surat_jalan?: string;
    alasan: string;
    petugas?: string;
    items: { barcode: string; qty: number; kode_ukuran?: string; nama_ukuran?: string }[];
  }): Promise<{
    pengembalian_id: string;
    no_retur: string;
    total_pcs: number;
    pengembalian: Pengembalian;
  }> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Daftar kasur yang dikembalikan tidak boleh kosong');
    }
    if (!data.pembeli_nama.trim()) {
      throw new Error('Nama pembeli/customer yang mengembalikan wajib diisi');
    }
    if (!data.alasan.trim()) {
      throw new Error('Alasan pengembalian barang wajib diisi');
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    let returSeq = getLocalData<number>(STORAGE_KEYS.RETUR_SEQ, 1);
    const noRetur = `RT-${dateStr}-${String(returSeq).padStart(4, '0')}`;
    setLocalData(STORAGE_KEYS.RETUR_SEQ, returSeq + 1);

    const pengembalianId = `retur-${Date.now()}`;
    const barangs = getLocalData<Barang[]>(STORAGE_KEYS.BARANG, []);
    const ukurans = getLocalData<Ukuran[]>(STORAGE_KEYS.UKURAN, SEED_UKURAN);

    let totalRestored = 0;
    const pengembalianItems: PengembalianItem[] = [];

    for (const it of data.items) {
      if (it.qty <= 0) continue;
      const bcode = it.barcode.trim();
      const kodeUkuran = it.kode_ukuran || bcode.split('-')[0];
      const matchingUkuran = ukurans.find(u => u.kode === kodeUkuran);

      // Cari barang dengan barcode ini yang berstatus 'keluar' untuk dikembalikan ke 'di_gudang'
      const keluarItems = barangs.filter(b => b.barcode === bcode && b.status === 'keluar');

      let restoredCount = 0;
      for (let i = 0; i < Math.min(it.qty, keluarItems.length); i++) {
        keluarItems[i].status = 'di_gudang';
        keluarItems[i].updated_at = new Date().toISOString();
        restoredCount++;
      }

      // Jika jumlah yang dikembalikan lebih banyak dari yang tercatat keluar, tambahkan record baru ke di_gudang
      const sisaToAdd = it.qty - restoredCount;
      for (let i = 0; i < sisaToAdd; i++) {
        barangs.push({
          id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          barcode: bcode,
          ukuran_id: matchingUkuran?.id || ukurans[0]?.id || 'u-200',
          penerimaan_id: 'retur-incoming',
          tanggal_masuk: now.toISOString().slice(0, 10),
          status: 'di_gudang',
          created_at: new Date().toISOString(),
        });
      }

      totalRestored += it.qty;
      pengembalianItems.push({
        id: `ritm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pengembalian_id: pengembalianId,
        barcode: bcode,
        kode_ukuran: kodeUkuran,
        nama_ukuran: it.nama_ukuran || matchingUkuran?.nama || `Kasur Ukuran ${kodeUkuran}`,
        qty: it.qty,
      });
    }

    const newPengembalian: Pengembalian = {
      id: pengembalianId,
      no_retur: noRetur,
      tanggal: new Date().toISOString(),
      pembeli_nama: data.pembeli_nama.trim(),
      no_surat_jalan: data.no_surat_jalan?.trim() || undefined,
      alasan: data.alasan.trim(),
      petugas: data.petugas || 'Staf Gudang',
      total_pcs: totalRestored,
      items: pengembalianItems,
      created_at: new Date().toISOString(),
    };

    const returList = getLocalData<Pengembalian[]>(STORAGE_KEYS.RETUR, []);
    returList.unshift(newPengembalian);

    setLocalData(STORAGE_KEYS.BARANG, barangs);
    setLocalData(STORAGE_KEYS.RETUR, returList);

    addLocalAudit('PENGEMBALIAN_BARANG', 'pengembalian', pengembalianId, {
      no_retur: noRetur,
      pembeli_nama: data.pembeli_nama,
      total_pcs: totalRestored,
      alasan: data.alasan,
    });

    return {
      pengembalian_id: pengembalianId,
      no_retur: noRetur,
      total_pcs: totalRestored,
      pengembalian: newPengembalian,
    };
  },

  async getPengembalianList(): Promise<Pengembalian[]> {
    return getLocalData<Pengembalian[]>(STORAGE_KEYS.RETUR, []);
  },

  async getPengembalianById(id: string): Promise<Pengembalian | null> {
    const list = await this.getPengembalianList();
    return list.find(r => r.id === id) || null;
  },

  // --------------------------------------------------------------------------
  // AUDIT LOG
  // --------------------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('audit_log').select('*').order('waktu', { ascending: false }).limit(100);
      if (!error && data) return data;
    }
    return getLocalData<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
  },

  // --------------------------------------------------------------------------
  // KARYAWAN (MASTER DATA PAYROLL)
  // --------------------------------------------------------------------------
  async getKaryawanList(): Promise<Karyawan[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('karyawan').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return getLocalData<Karyawan[]>(STORAGE_KEYS.KARYAWAN, SEED_KARYAWAN);
  },

  async saveKaryawan(data: Partial<Karyawan>): Promise<Karyawan> {
    if (isSupabaseConfigured && supabase) {
      if (data.id && !data.id.startsWith('kar-')) {
        const { data: updated, error } = await supabase
          .from('karyawan')
          .update({
            nik: data.nik,
            nama: data.nama,
            jabatan: data.jabatan,
            tanggal_masuk: data.tanggal_masuk,
            tanggal_resign: data.tanggal_resign,
            gaji_pokok_standar: data.gaji_pokok_standar,
            uang_makan_standar: data.uang_makan_standar,
            transport_standar: data.transport_standar,
            tunjangan_jabatan_standar: data.tunjangan_jabatan_standar,
            tunjangan_operasional_standar: data.tunjangan_operasional_standar,
            aktif: data.aktif,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id)
          .select()
          .single();
        if (!error && updated) return updated;
      } else {
        const payload = {
          nik: data.nik,
          nama: data.nama,
          jabatan: data.jabatan,
          tanggal_masuk: data.tanggal_masuk || new Date().toISOString().slice(0, 10),
          tanggal_resign: data.tanggal_resign,
          gaji_pokok_standar: data.gaji_pokok_standar || 0,
          uang_makan_standar: data.uang_makan_standar || 0,
          transport_standar: data.transport_standar || 0,
          tunjangan_jabatan_standar: data.tunjangan_jabatan_standar || 0,
          tunjangan_operasional_standar: data.tunjangan_operasional_standar || 0,
          aktif: data.aktif ?? true,
        };
        const { data: created, error } = await supabase.from('karyawan').insert([payload]).select().single();
        if (!error && created) return created;
      }
    }

    const list = await this.getKaryawanList();
    if (data.id) {
      const idx = list.findIndex(k => k.id === data.id);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          ...data,
          updated_at: new Date().toISOString(),
        } as Karyawan;
        setLocalData(STORAGE_KEYS.KARYAWAN, list);
        addLocalAudit('UPDATE_KARYAWAN', 'karyawan', data.id, list[idx]);
        return list[idx];
      }
    }

    const newKaryawan: Karyawan = {
      id: `kar-${Date.now()}`,
      nik: data.nik || `KB-${Date.now().toString().slice(-6)}`,
      nama: data.nama || 'Karyawan Baru',
      jabatan: data.jabatan || 'Staf',
      tanggal_masuk: data.tanggal_masuk || new Date().toISOString().slice(0, 10),
      tanggal_resign: data.tanggal_resign || undefined,
      gaji_pokok_standar: data.gaji_pokok_standar || 0,
      uang_makan_standar: data.uang_makan_standar || 0,
      transport_standar: data.transport_standar || 0,
      tunjangan_jabatan_standar: data.tunjangan_jabatan_standar || 0,
      tunjangan_operasional_standar: data.tunjangan_operasional_standar || 0,
      aktif: data.aktif ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.push(newKaryawan);
    setLocalData(STORAGE_KEYS.KARYAWAN, list);
    addLocalAudit('CREATE_KARYAWAN', 'karyawan', newKaryawan.id, newKaryawan);
    return newKaryawan;
  },

  async deleteKaryawan(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('karyawan').delete().eq('id', id);
      if (!error) return true;
    }

    const list = await this.getKaryawanList();
    const filtered = list.filter(k => k.id !== id);
    setLocalData(STORAGE_KEYS.KARYAWAN, filtered);
    addLocalAudit('DELETE_KARYAWAN', 'karyawan', id, { id });
    return true;
  },

  // --------------------------------------------------------------------------
  // PAYROLL & SLIP GAJI
  // --------------------------------------------------------------------------
  async getPayrollList(periode?: string): Promise<PayrollRecord[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('payroll').select('*').order('created_at', { ascending: false });
      if (periode && periode !== 'all') {
        query = query.ilike('periode_bulan', periode);
      }
      const { data, error } = await query;
      if (!error && data) return data;
    }

    const list = getLocalData<PayrollRecord[]>(STORAGE_KEYS.PAYROLL, SEED_PAYROLL);
    if (!periode || periode === 'all') return list;
    return list.filter(p => p.periode_bulan.toLowerCase() === periode.toLowerCase());
  },

  async getPayrollById(id: string): Promise<PayrollRecord | null> {
    const list = await this.getPayrollList();
    return list.find(p => p.id === id) || null;
  },

  async simpanPayroll(data: Partial<PayrollRecord>): Promise<{
    payroll: PayrollRecord;
    no_slip: string;
  }> {
    const list = await this.getPayrollList();
    const gjp = Number(data.gaji_pokok) || 0;
    const makan = Number(data.uang_makan) || 0;
    const trans = Number(data.transport) || 0;
    const tjab = Number(data.tunjangan_jabatan) || 0;
    const topr = Number(data.tunjangan_operasional) || 0;
    const thr = Number(data.thr) || 0;
    const lembur = Number(data.lembur) || 0;

    // Formula: Jumlah Pendapatan
    const jumlahPendapatan = gjp + makan + trans + tjab + topr + thr + lembur;

    // Formula: Potongan Absensi (Alpha + Izin + Sakit + WFH)
    const potAlpha = Number(data.potongan_alpha) || 0;
    const potIzin = Number(data.potongan_izin) || 0;
    const potSakit = Number(data.potongan_sakit) || 0;
    const potWfh = Number(data.potongan_wfh) || 0;
    const totalAbsensi = potAlpha + potIzin + potSakit + potWfh;

    // Formula: Total Potongan
    const jamsostek = Number(data.jamsostek) || 0;
    const bpjs = Number(data.bpjs) || 0;
    const pinjaman = Number(data.pinjaman) || 0;
    const potTransport = Number(data.potongan_transport) || 0;
    const totalPotongan = totalAbsensi + jamsostek + bpjs + pinjaman + potTransport;

    // Formula: Take Home Pay (THP)
    const thp = Math.max(0, jumlahPendapatan - totalPotongan);

    let payrollRecord: PayrollRecord;

    if (data.id) {
      const idx = list.findIndex(p => p.id === data.id);
      if (idx >= 0) {
        payrollRecord = {
          ...list[idx],
          ...data,
          gaji_pokok: gjp,
          uang_makan: makan,
          transport: trans,
          tunjangan_jabatan: tjab,
          tunjangan_operasional: topr,
          thr: thr,
          lembur: lembur,
          jumlah_pendapatan: jumlahPendapatan,
          hari_alpha: Number(data.hari_alpha) || 0,
          potongan_alpha: potAlpha,
          hari_izin: Number(data.hari_izin) || 0,
          potongan_izin: potIzin,
          hari_sakit: Number(data.hari_sakit) || 0,
          potongan_sakit: potSakit,
          hari_wfh: Number(data.hari_wfh) || 0,
          potongan_wfh: potWfh,
          total_potongan_absensi: totalAbsensi,
          jamsostek: jamsostek,
          bpjs: bpjs,
          pinjaman: pinjaman,
          potongan_transport: potTransport,
          total_potongan: totalPotongan,
          take_home_pay: thp,
          updated_at: new Date().toISOString(),
        } as PayrollRecord;

        list[idx] = payrollRecord;
        setLocalData(STORAGE_KEYS.PAYROLL, list);
        addLocalAudit('UPDATE_PAYROLL', 'payroll', payrollRecord.id, payrollRecord);
        return { payroll: payrollRecord, no_slip: payrollRecord.no_slip };
      }
    }

    // Nomor Slip Baru: SLIP-YYYYMM-XXXX
    let seq = getLocalData<number>(STORAGE_KEYS.PAYROLL_SEQ, 3);
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const noSlip = `SLIP-${dateStr}-${String(seq).padStart(4, '0')}`;
    setLocalData(STORAGE_KEYS.PAYROLL_SEQ, seq + 1);

    const newId = `pay-${Date.now()}`;
    payrollRecord = {
      id: newId,
      no_slip: noSlip,
      periode_bulan: data.periode_bulan || 'November 2026',
      tanggal_pembayaran: data.tanggal_pembayaran || new Date().toISOString().slice(0, 10),
      karyawan_id: data.karyawan_id,
      nik: data.nik || '',
      nama: data.nama || '',
      jabatan: data.jabatan || '',
      tanggal_masuk: data.tanggal_masuk || '',
      tanggal_resign: data.tanggal_resign || undefined,
      gaji_pokok: gjp,
      uang_makan: makan,
      transport: trans,
      tunjangan_jabatan: tjab,
      tunjangan_operasional: topr,
      thr: thr,
      lembur: lembur,
      jumlah_pendapatan: jumlahPendapatan,
      hari_alpha: Number(data.hari_alpha) || 0,
      potongan_alpha: potAlpha,
      hari_izin: Number(data.hari_izin) || 0,
      potongan_izin: potIzin,
      hari_sakit: Number(data.hari_sakit) || 0,
      potongan_sakit: potSakit,
      hari_wfh: Number(data.hari_wfh) || 0,
      potongan_wfh: potWfh,
      total_potongan_absensi: totalAbsensi,
      jamsostek: jamsostek,
      bpjs: bpjs,
      pinjaman: pinjaman,
      potongan_transport: potTransport,
      total_potongan: totalPotongan,
      take_home_pay: thp,
      catatan: data.catatan || '',
      status: (data.status as any) || 'dibayar',
      dibuat_oleh: data.dibuat_oleh || 'Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    list.unshift(payrollRecord);
    setLocalData(STORAGE_KEYS.PAYROLL, list);
    addLocalAudit('CREATE_PAYROLL', 'payroll', newId, payrollRecord);

    return {
      payroll: payrollRecord,
      no_slip: noSlip,
    };
  },

  async deletePayroll(id: string): Promise<boolean> {
    const list = await this.getPayrollList();
    const filtered = list.filter(p => p.id !== id);
    setLocalData(STORAGE_KEYS.PAYROLL, filtered);
    addLocalAudit('DELETE_PAYROLL', 'payroll', id, { id });
    return true;
  },

  resetAllTransactionAndKaryawanData(): void {
    resetTransactionAndKaryawanData();
    initLocalSeedData(true);
  },

  // --------------------------------------------------------------------------
  // AUTENTIKASI AKUN RESMI (@wins.com)
  // --------------------------------------------------------------------------
  async getOfficialAccounts(): Promise<UserAccount[]> {
    return OFFICIAL_ACCOUNTS;
  },

  getAuthUser(): UserAccount | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async login(
    email: string,
    password?: string
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = OFFICIAL_ACCOUNTS.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return {
        success: false,
        error: `Email "${email}" tidak terdaftar. Gunakan akun resmi @wins.com (sukesti@wins.com, deva@wins.com, atau wiwin@wins.com).`,
      };
    }

    // Validasi password (default wins123 atau sesuai akun)
    const validPasswords = [user.password, 'wins123', 'admin123', 'owner123'].filter(Boolean);
    if (password && !validPasswords.includes(password.trim())) {
      return {
        success: false,
        error: 'Password salah. Silakan coba lagi (Default: wins123).',
      };
    }

    // Set auth user di localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    }

    addLocalAudit('LOGIN', 'auth', user.id, {
      email: user.email,
      nama: user.nama,
      role: user.role,
    });

    return {
      success: true,
      user,
    };
  },

  async logout(): Promise<void> {
    const curr = this.getAuthUser();
    if (curr) {
      addLocalAudit('LOGOUT', 'auth', curr.id, { email: curr.email, nama: curr.nama });
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  },

  async switchAccount(email: string): Promise<UserAccount | null> {
    const res = await this.login(email);
    return res.user || null;
  },
};

