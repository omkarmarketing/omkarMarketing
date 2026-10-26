import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  valuesGet: vi.fn(),
  valuesUpdate: vi.fn(),
  valuesAppend: vi.fn(),
  valuesClear: vi.fn(),
  batchUpdate: vi.fn(),
  spreadsheetsGet: vi.fn(),
}));

vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: class {} },
    sheets: () => ({
      spreadsheets: {
        get: mocks.spreadsheetsGet,
        batchUpdate: mocks.batchUpdate,
        values: {
          get: mocks.valuesGet,
          update: mocks.valuesUpdate,
          append: mocks.valuesAppend,
          clear: mocks.valuesClear,
        },
      },
    }),
  },
}));

import { insertRowChronologically } from '@/lib/sheets';

const SHEET_ID = 'sheet-id';
const SHEET_NAME = 'FY2024-25';
const DATE_INDEX = 2;

// ['sellerCompanyName', 'sellerCompanyCity', 'date', ...]
const HEADER = ['sellerCompanyName', 'sellerCompanyCity', 'date', 'qty'];
const row = (date: string, qty: number) => ['Seller', 'Rajkot', date, qty];
const newRow = row('15-01-25', 99);

function withExistingRows(rows: (string | number)[][]) {
  mocks.valuesGet.mockResolvedValue({
    data: { values: rows.length ? [HEADER, ...rows] : [] },
  });
}

describe('insertRowChronologically', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.spreadsheetsGet.mockResolvedValue({
      data: { sheets: [{ properties: { title: SHEET_NAME, sheetId: 42 } }] },
    });
    mocks.batchUpdate.mockResolvedValue({ data: {} });
    mocks.valuesUpdate.mockResolvedValue({ data: {} });
    mocks.valuesAppend.mockResolvedValue({ data: {} });
  });

  it('opens a blank row before writing a back-dated transaction', async () => {
    // Existing rows occupy sheet rows 2 and 3; the new row belongs on row 3.
    withExistingRows([row('10-01-25', 1), row('20-01-25', 2)]);

    await insertRowChronologically(SHEET_ID, SHEET_NAME, newRow, DATE_INDEX, new Date(2025, 0, 15));

    expect(mocks.batchUpdate).toHaveBeenCalledTimes(1);
    const request = mocks.batchUpdate.mock.calls[0][0].requestBody.requests[0].insertDimension;
    expect(request.range).toMatchObject({
      sheetId: 42,
      dimension: 'ROWS',
      startIndex: 2, // 0-based grid index of sheet row 3
      endIndex: 3,
    });

    expect(mocks.valuesUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.valuesUpdate.mock.calls[0][0]).toMatchObject({
      range: `'${SHEET_NAME}'!A3`,
      requestBody: { values: [newRow] },
    });
  });

  it('never writes over an existing row without inserting first', async () => {
    withExistingRows([row('20-01-25', 2)]);

    await insertRowChronologically(SHEET_ID, SHEET_NAME, newRow, DATE_INDEX, new Date(2025, 0, 15));

    // The regression: values.update alone would have destroyed row 2.
    expect(mocks.batchUpdate).toHaveBeenCalled();
    expect(mocks.batchUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.valuesUpdate.mock.invocationCallOrder[0],
    );
    expect(mocks.valuesUpdate.mock.calls[0][0].range).toBe(`'${SHEET_NAME}'!A2`);
  });

  it('appends without shifting when the transaction is chronologically last', async () => {
    withExistingRows([row('10-01-25', 1), row('12-01-25', 2)]);

    await insertRowChronologically(SHEET_ID, SHEET_NAME, newRow, DATE_INDEX, new Date(2025, 0, 15));

    expect(mocks.valuesAppend).toHaveBeenCalledTimes(1);
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
    expect(mocks.valuesUpdate).not.toHaveBeenCalled();
  });

  it('appends when the sheet is empty', async () => {
    withExistingRows([]);

    await insertRowChronologically(SHEET_ID, SHEET_NAME, newRow, DATE_INDEX, new Date(2025, 0, 15));

    expect(mocks.valuesAppend).toHaveBeenCalledTimes(1);
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
  });

  it('skips unparseable existing dates instead of inserting at the wrong row', async () => {
    withExistingRows([row('', 1), row('not-a-date', 2), row('20-01-25', 3)]);

    await insertRowChronologically(SHEET_ID, SHEET_NAME, newRow, DATE_INDEX, new Date(2025, 0, 15));

    // Only the third row is dated after the new transaction: sheet row 4.
    expect(mocks.valuesUpdate.mock.calls[0][0].range).toBe(`'${SHEET_NAME}'!A4`);
  });
});
