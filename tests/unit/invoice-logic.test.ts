import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock googleapis ENTIRELY before importing sheets
vi.mock('googleapis', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn().mockResolvedValue({ data: { sheets: [] } }),
      values: {
        get: vi.fn(),
        update: vi.fn(),
      },
      batchUpdate: vi.fn(),
    },
  };
  return {
    google: {
      auth: {
        GoogleAuth: class {
          constructor() {}
          getSigner() { return vi.fn(); }
        },
      },
      sheets: vi.fn(() => mockSheets),
    },
  };
});

// Now import the actual code
import { getNextInvoiceNumber, sheets } from '@/lib/sheets';

describe('getNextInvoiceNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for ensureSheet (called via get)
    vi.mocked(sheets.spreadsheets.get).mockResolvedValue({
      data: { sheets: [{ properties: { title: 'InvoiceTracker', sheetId: 123 } }] }
    } as any);
  });

  it('should return 1549 if sheet is empty (start from 1548 + 1)', async () => {
    vi.mocked(sheets.spreadsheets.values.get).mockResolvedValueOnce({
      data: { values: [] },
    } as any);
    
    vi.mocked(sheets.spreadsheets.values.update).mockResolvedValueOnce({} as any);

    const nextNum = await getNextInvoiceNumber('mock-id');
    expect(nextNum).toBe(1549);
    expect(sheets.spreadsheets.values.update).toHaveBeenCalled();
  });

  it('should increment the existing invoice number', async () => {
    vi.mocked(sheets.spreadsheets.values.get).mockResolvedValueOnce({
      data: { values: [['2000']] },
    } as any);
    
    vi.mocked(sheets.spreadsheets.values.update).mockResolvedValueOnce({} as any);

    const nextNum = await getNextInvoiceNumber('mock-id');
    expect(nextNum).toBe(2001);
    expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith(expect.objectContaining({
      requestBody: { values: [[2001]] }
    }));
  });
});
