import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

/* -------------------- HELPERS -------------------- */
const formatAmount = (v: number) => Number(v).toFixed(2);

const convertNumberToWords = (num: number): string => {
  if (!num) return "ZERO ONLY";
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
  const w = (n: number): string =>
    n < 20
      ? a[n]
      : n < 100
      ? b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "")
      : n < 1000
      ? a[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " " + w(n % 100) : "")
      : w(Math.floor(n / 1000)) + " THOUSAND " + w(n % 1000);
  return w(num).trim() + " ONLY";
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
    flex: 0.9,
    textAlign: "center",
  },
  annexCellRight: {
    fontSize: 8.5,
    padding: 5,
    textAlign: "center",
    flex: 0.9,
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
          <Text style={styles.infoLabel}>Invoice No</Text>
          <Text style={styles.infoValue}>{data.summary.invoiceNo}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Invoice Date</Text>
          <Text style={styles.infoValue}>{data.summary.invoiceDate}</Text>
          <Text style={styles.infoLabel}></Text>
          <Text style={styles.infoValue}></Text>
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
            Brokerage for the period {data.summary.dateRange.start} to{" "}
            {data.summary.dateRange.end}
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

    {/* ================= PAGE 2 ================= */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.annexTitle}>Annexure – Transaction Details</Text>

      <View style={{ borderWidth: 1, borderColor: "#ccc" }}>
        <View style={styles.annexHeader}>
          <Text style={{ ...styles.annexCell, fontWeight: "bold" }}>
            Seller
          </Text>
          <Text style={{ ...styles.annexCell, fontWeight: "bold" }}>
            Seller City
          </Text>
          <Text style={{ ...styles.annexCell, fontWeight: "bold" }}>
            Date
          </Text>
          <Text style={{ ...styles.annexCell, fontWeight: "bold" }}>
            Buyer
          </Text>
          <Text style={{ ...styles.annexCell, fontWeight: "bold" }}>
            Buyer City
          </Text>
          <Text style={{ ...styles.annexCell, fontWeight: "bold" }}>
            Product
          </Text>
          <Text style={{ ...styles.annexCellRight, fontWeight: "bold" }}>
            Qty
          </Text>
          <Text style={{ ...styles.annexCellRight, fontWeight: "bold" }}>
            Rate/Pc
          </Text>
          <Text style={{ ...styles.annexCell, fontWeight: "bold" }}>
            Remarks
          </Text>
        </View>

        {data.transactions.map((t: any, i: number) => (
          <View key={i} style={styles.annexRow}>
            <Text style={styles.annexCell}>{t.sellerCompanyName}</Text>
            <Text style={styles.annexCell}>{t.sellerCompanyCity}</Text>
            <Text style={styles.annexCell}>{t.date}</Text>
            <Text style={styles.annexCell}>{t.buyerCompanyName}</Text>
            <Text style={styles.annexCell}>{t.buyerCompanyCity}</Text>
            <Text style={styles.annexCell}>{t.product}</Text>
            <Text style={styles.annexCellRight}>{t.qty}</Text>
            <Text style={styles.annexCellRight}>{formatAmount(t.price)}</Text>
            <Text style={styles.annexCell}>{t.remarks || ""}</Text>
          </View>
        ))}

        {/* SUMMARY */}
        {/* TOTAL QTY */}
        <View style={[styles.annexRow, { backgroundColor: "#fafafa" }]}>
          <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 7 }}>
            Total Quantity
          </Text>
          <Text style={styles.annexCellRight}>{data.summary.totalQty}</Text>
          <Text style={styles.annexCellRight}></Text>
          <Text style={styles.annexCell}></Text>
        </View>

        {/* BROKERAGE RATE */}
        <View style={[styles.annexRow, { backgroundColor: "#fafafa" }]}>
          <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 7 }}>
            Brokerage Rate (per Qty)
          </Text>
          <Text style={styles.annexCellRight}>
            {formatAmount(data.summary.brokerageRate)}
          </Text>
          <Text style={styles.annexCellRight}></Text>
          <Text style={styles.annexCell}></Text>
        </View>

        {/* TOTAL BROKERAGE */}
        <View style={[styles.annexRow, { backgroundColor: "#f0f0f0" }]}>
          <Text style={{ ...styles.annexCell, fontWeight: "bold", flex: 7 }}>
            Total Brokerage Amount
          </Text>
          <Text style={{ ...styles.annexCellRight, fontWeight: "bold" }}>
            {formatAmount(data.summary.totalPayable)}
          </Text>
          <Text style={styles.annexCellRight}></Text>
          <Text style={styles.annexCell}></Text>
        </View>
      </View>
    </Page>
  </Document>
);
