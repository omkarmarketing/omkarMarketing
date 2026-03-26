import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatDateForDisplay, formatDateToDots, formatDateWithHyphens } from "@/lib/date-utils";

/* -------------------- HELPERS -------------------- */
const formatAmount = (v: number) => Number(v).toFixed(2);

const convertNumberToWords = (num: number): string => {
  if (!num || num === 0) return "ZERO ONLY";

  const a = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const b = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

  const w = (n: number): string => {
    if (n < 20) return a[Math.floor(n)];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[Math.floor(n % 10)] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " " + w(n % 100) : "");
    if (n < 100000) return w(Math.floor(n / 1000)) + " THOUSAND" + (n % 1000 ? " " + w(n % 1000) : "");
    if (n < 10000000) return w(Math.floor(n / 100000)) + " LAKH" + (n % 100000 ? " " + w(n % 100000) : "");
    return w(Math.floor(n / 10000000)) + " CRORE" + (n % 10000000 ? " " + w(n % 10000000) : "");
  };

  const main = Math.floor(num);
  const decimals = Math.round((num - main) * 100);

  let res = w(main).trim();
  if (decimals > 0) {
    res += " AND " + w(decimals).trim() + " PAISA";
  }
  return res + " ONLY";
};

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#222",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingBottom: 12,
    marginBottom: 16,
  },
  logoWrapper: {
    width: 74,
    marginRight: 12,
  },
  logo: {
    width: 74,
  },
  companyTitle: {
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 0.4,
  },
  companySub: {
    fontSize: 9,
    marginTop: 2,
    color: "#555",
  },
  companyContact: {
    fontSize: 8.5,
    marginTop: 4,
    color: "#666",
    lineHeight: 1.4,
  },

  /* INFO TABLE */
  infoTable: {
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  infoLabel: {
    width: "20%",
    padding: 8,
    backgroundColor: "#f6f6f6",
    fontWeight: "bold",
  },
  infoValue: {
    width: "30%",
    padding: 8,
  },
  bankBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
  },
  bankTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  bankRow: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  jurisdiction: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 8.5,
    color: "#555",
  },

  /* MAIN TABLE */
  table: {
    borderWidth: 1,
    borderColor: "#ccc",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderBottomWidth: 1,
  },
  th: {
    padding: 7,
    fontWeight: "bold",
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  td: {
    padding: 7,
  },
  tdRight: {
    padding: 7,
    textAlign: "right",
  },

  /* TOTAL BOX */
  totalBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  totalRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  bold: { fontWeight: "bold" },

  /* ANNEXURE */
  annexTitle: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 12,
  },
  annexHeader: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderBottomWidth: 1,
  },
  annexRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  annexCell: {
    fontSize: 8.5,
    padding: 5,
    flex: 0.8,
    textAlign: "center",
  },
  annexCellRight: {
    fontSize: 8.5,
    padding: 5,
    textAlign: "center",
    flex: 0.8,
  },
  annexCellSmall: {
    fontSize: 8.5,
    padding: 5,
    flex: 0.8,
    textAlign: "center",
  },
  annexCellSmallRight: {
    fontSize: 8.5,
    padding: 5,
    textAlign: "center",
    flex: 0.8,
  },
});

/* -------------------- DOCUMENT -------------------- */
export const InvoiceDocument = ({ data }: any) => (
  <Document>
    {/* ================= PAGE 1 ================= */}
    <Page size="A4" style={styles.page}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <Image src="/omkar-logo.png" style={styles.logo} />
        </View>
        <View>
          <Text style={styles.companyTitle}>OMKAR MARKETING</Text>
          <Text style={styles.companySub}>Edible Oil Brokerage</Text>
          <Text style={styles.companyContact}>
            B-205, Safal 6, Hanumapura, Shahibaug, Ahmedabad – 380004{"\n"}
            Amit: 9879788229 | Chandrakant: 9687888229
          </Text>
        </View>
      </View>

      {/* INFO */}
      <View style={styles.infoTable}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Party Name</Text>
          <Text style={styles.infoValue}>{data.summary.companyName}</Text>
          <Text style={styles.infoLabel}>City</Text>
          <Text style={styles.infoValue}>{data.summary.companyCity || ""}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Invoice No</Text>
          <Text style={styles.infoValue}>{data.summary.invoiceNo}</Text>
          <Text style={styles.infoLabel}>Invoice Date</Text>
          <Text style={styles.infoValue}>{data.summary.invoiceDate}</Text>
        </View>
      </View>

      {/* MAIN TABLE */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.th, flex: 0.5 }}>#</Text>
          <Text style={{ ...styles.th, flex: 4 }}>Description</Text>
          <Text style={{ ...styles.th, flex: 1, textAlign: "right" }}></Text>
          <Text style={{ ...styles.th, flex: 1, textAlign: "right" }}></Text>
          <Text style={{ ...styles.th, flex: 1, textAlign: "right" }}>
            Amount
          </Text>
        </View>

        <View style={styles.tr}>
          <Text style={{ ...styles.td, flex: 0.5 }}>1</Text>
          <Text style={{ ...styles.td, flex: 4 }}>
            {data.summary.isManual 
              ? data.summary.description 
              : `Brokerage for the period ${formatDateWithHyphens(data.summary.dateRange.start)} to ${formatDateWithHyphens(data.summary.dateRange.end)}`}
          </Text>
          <Text style={{ ...styles.tdRight, flex: 1 }}></Text>
          <Text style={{ ...styles.tdRight, flex: 1 }}></Text>
          <Text style={{ ...styles.tdRight, flex: 1 }}>
            {formatAmount(data.summary.totalPayable)}
          </Text>
        </View>
      </View>

      {/* TOTAL */}
      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
          <Text style={styles.bold}>Total Amount</Text>
          <Text style={{ marginLeft: "auto", fontWeight: "bold" }}>
            {formatAmount(data.summary.totalPayable)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text>
            Amount in Words: {convertNumberToWords(data.summary.totalPayable)}
          </Text>
        </View>
      </View>
      {/* BANK DETAILS */}
      <View style={styles.bankBox}>
        <Text style={styles.bankTitle}>Bank Details:</Text>

        <Text style={styles.bankRow}>Bank: Bank of India</Text>
        <Text style={styles.bankRow}>Branch: Bopal Branch, Ahmedabad</Text>
        <Text style={styles.bankRow}>Company Name : Omkar Marketing</Text>
        <Text style={styles.bankRow}>Account No: 2042 2011 0000 441</Text>
        <Text style={styles.bankRow}>Pan No: AAGFO0133Q</Text>
        <Text style={styles.bankRow}>IFSC Code: BKID0002042</Text>
        <Text style={styles.bankRow}>MICR Code: 380013055</Text>
      </View>

      <Text style={styles.jurisdiction}>Subject to Ahmedabad Jurisdiction</Text>
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />

      {/* SIGN */}
      <Text style={{ marginTop: 30, textAlign: "right", fontWeight: "bold" }}>
        For OMKAR MARKETING{"\n"}Authorised Signatory
      </Text>
    </Page>

    {/* ================= PAGE 2 (Omit in Manual Mode) ================= */}
    {!data.summary.isManual && (
      <Page size="A4" style={styles.page}>
        <Text style={styles.annexTitle}>Annexure – Transaction Details</Text>

        <View style={{ borderWidth: 1, borderColor: "#ccc" }}>
          <View style={styles.annexHeader}>
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 1 }}>Seller</Text>
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 0.8 }}>Seller City</Text>
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 0.8 }}>Date</Text>
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 1 }}>Buyer</Text>
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 0.8 }}>Buyer City</Text>
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 1 }}>Product</Text>
            <Text style={{ ...styles.annexCellRight, fontWeight: "bold", flex: 0.5 }}>Qty</Text>
            <Text style={{ ...styles.annexCellRight, fontWeight: "bold", flex: 0.7 }}>Rate/Pc</Text>
            {data.summary.isAmit && (
              <Text style={{ ...styles.annexCellRight, fontWeight: "bold", flex: 0.6 }}>Bkrg</Text>
            )}
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 1 }}>Remarks</Text>
          </View>

          {data.transactions.map((t: any, i: number) => (
            <View key={i} style={styles.annexRow}>
              <Text style={{ ...styles.annexCell, flex: 1 }}>{t.sellerCompanyName || ""}</Text>
              <Text style={{ ...styles.annexCell, flex: 0.8 }}>{t.sellerCompanyCity || ""}</Text>
              <Text style={{ ...styles.annexCell, flex: 0.8 }}>{formatDateToDots(t.date || "")}</Text>
              <Text style={{ ...styles.annexCell, flex: 1 }}>{t.buyerCompanyName || ""}</Text>
              <Text style={{ ...styles.annexCell, flex: 0.8 }}>{t.buyerCompanyCity || ""}</Text>
              <Text style={{ ...styles.annexCell, flex: 1 }}>{t.product || ""}</Text>
              <Text style={{ ...styles.annexCellRight, flex: 0.5 }}>{t.qty || 0}</Text>
              <Text style={{ ...styles.annexCellRight, flex: 0.7 }}>{formatAmount(t.price || 0)}</Text>
              {data.summary.isAmit && (
                <Text style={{ ...styles.annexCellRight, flex: 0.6 }}>{t.brokerageRate || 0}</Text>
              )}
              <Text style={{ ...styles.annexCell, flex: 1 }}>{t.remarks || ""}</Text>
            </View>
          ))}

          {/* SUMMARY */}
          <View style={[styles.annexRow, { backgroundColor: "#fafafa" }]}>
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 5.9 }}>
              Total Quantity
            </Text>
            <Text style={{ ...styles.annexCellRight, flex: 0.7 }}>{data.summary.totalQty}</Text>
            <Text style={{ ...styles.annexCellRight, flex: data.summary.isAmit ? 1.6 : 1.0 }}></Text>
          </View>

          {!data.summary.isAmit && (
            <View style={[styles.annexRow, { backgroundColor: "#fafafa" }]}>
              <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 5.9 }}>
                Brokerage Rate (per Qty)
              </Text>
              <Text style={{ ...styles.annexCellRight, flex: 0.7 }}>
                {formatAmount(data.summary.brokerageRate)}
              </Text>
              <Text style={{ ...styles.annexCellRight, flex: 1.0 }}></Text>
            </View>
          )}

          <View style={[styles.annexRow, { backgroundColor: "#fafafa" }]}>
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 5.9 }}>
              {data.summary.isAmit ? "Total Brokerage (Sum of per-product rates)" : "Calculation (Total Qty * Brokerage Rate)"}
            </Text>
            <Text style={{ ...styles.annexCellRight, flex: 0.7 }}>
              {formatAmount(data.summary.brokerageAmount)}
            </Text>
            <Text style={{ ...styles.annexCellRight, flex: data.summary.isAmit ? 1.6 : 1.0 }}></Text>
          </View>

          {data.summary.otherSideBrokerage !== undefined && data.summary.otherSideBrokerage > 0 && (
            <View style={[styles.annexRow, { backgroundColor: "#fafafa" }]}>
              <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 5.9 }}>
                Other Side Brokerage
              </Text>
              <Text style={{ ...styles.annexCellRight, flex: 0.7 }}>
                {formatAmount(data.summary.otherSideBrokerage)}
              </Text>
              <Text style={{ ...styles.annexCellRight, flex: data.summary.isAmit ? 1.6 : 1.0 }}></Text>
            </View>
          )}

          <View style={[styles.annexRow, { backgroundColor: "#f0f0f0" }]}>
            <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 5.9 }}>
              Total Brokerage Amount (Total Amount)
            </Text>
            <Text style={{ ...styles.annexCellRight, fontWeight: "bold", flex: 0.7 }}>
              {formatAmount(data.summary.totalPayable)}
            </Text>
            <Text style={{ ...styles.annexCellRight, flex: data.summary.isAmit ? 1.6 : 1.0 }}></Text>
          </View>
        </View>
      </Page>
    )}
  </Document>
);
