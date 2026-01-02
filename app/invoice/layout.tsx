import { AppLayout } from "@/components/app-layout";

export default function InvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
