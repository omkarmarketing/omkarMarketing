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
    expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith(expect.objectContaining({
      requestBody: { values: [['Last Invoice Number'], [1549]] }
    }));
  });

  it('should use number from A1 if A1 is a number and A2 is empty', async () => {
    vi.mocked(sheets.spreadsheets.values.get).mockResolvedValueOnce({
      data: { values: [['3000']] },
    } as any);
    
    vi.mocked(sheets.spreadsheets.values.update).mockResolvedValueOnce({} as any);

    const nextNum = await getNextInvoiceNumber('mock-id');
    expect(nextNum).toBe(3001);
    expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith(expect.objectContaining({
      requestBody: { values: [['Last Invoice Number'], [3001]] }
    }));
  });

  it('should use number from A2 if A1 is header', async () => {
    vi.mocked(sheets.spreadsheets.values.get).mockResolvedValueOnce({
      data: { values: [['Last Invoice Number'], ['4000']] },
    } as any);
    
    vi.mocked(sheets.spreadsheets.values.update).mockResolvedValueOnce({} as any);

    const nextNum = await getNextInvoiceNumber('mock-id');
    expect(nextNum).toBe(4001);
    expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith(expect.objectContaining({
      requestBody: { values: [['Last Invoice Number'], [4001]] }
    }));
  });

  it('should return 1 if sheet contains 0', async () => {
    vi.mocked(sheets.spreadsheets.values.get).mockResolvedValueOnce({
      data: { values: [['Last Invoice Number'], ['0']] },
    } as any);
    
    vi.mocked(sheets.spreadsheets.values.update).mockResolvedValueOnce({} as any);

    const nextNum = await getNextInvoiceNumber('mock-id');
    expect(nextNum).toBe(1);
    expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith(expect.objectContaining({
      requestBody: { values: [['Last Invoice Number'], [1]] }
    }));
  });
});
