/**
 * Utilitas Format Mata Uang Rupiah dan Terbilang Bahasa Indonesia
 */

export function formatRupiah(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val || 0);
}

/**
 * Mengubah angka nominal menjadi kalimat terbilang Bahasa Indonesia
 * Contoh: 4850000 -> "Empat Juta Delapan Ratus Lima Puluh Ribu Rupiah"
 */
export function terbilang(n: number): string {
  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  const num = Math.floor(Math.abs(n || 0));
  if (num === 0) return 'Nol Rupiah';

  function convert(x: number): string {
    if (x < 12) {
      return bilangan[x];
    } else if (x < 20) {
      return convert(x - 10) + ' Belas';
    } else if (x < 100) {
      return convert(Math.floor(x / 10)) + ' Puluh ' + convert(x % 10);
    } else if (x < 200) {
      return 'Seratus ' + convert(x - 100);
    } else if (x < 1000) {
      return convert(Math.floor(x / 100)) + ' Ratus ' + convert(x % 100);
    } else if (x < 2000) {
      return 'Seribu ' + convert(x - 1000);
    } else if (x < 1000000) {
      return convert(Math.floor(x / 1000)) + ' Ribu ' + convert(x % 1000);
    } else if (x < 1000000000) {
      return convert(Math.floor(x / 1000000)) + ' Juta ' + convert(x % 1000000);
    } else if (x < 1000000000000) {
      return convert(Math.floor(x / 1000000000)) + ' Miliar ' + convert(x % 1000000000);
    } else {
      return convert(Math.floor(x / 1000000000000)) + ' Triliun ' + convert(x % 1000000000000);
    }
  }

  const result = convert(num).replace(/\s+/g, ' ').trim();
  return `${result} Rupiah`;
}
