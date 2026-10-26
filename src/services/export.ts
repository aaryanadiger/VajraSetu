import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { validateCSVExport } from './csv';

export async function shareCSVFile(csv: string, filename: string): Promise<string> {
  if (!FileSystem.documentDirectory) throw new Error('Document storage is unavailable on this device.');
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');

  validateCSVExport(csv);
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  const written = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
  validateCSVExport(written);
  if (written !== csv) throw new Error('CSV export verification failed after writing the file.');
  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Vajra Setu readings',
    UTI: 'public.comma-separated-values-text',
  });
  return path;
}
