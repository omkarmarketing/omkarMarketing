"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  HelpCircle,
  Key,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParsedTransaction {
  id: string;
  date: string;
  sellerCompanyName: string;
  sellerCompanyCity: string;
  sellerConfidence: "exact" | "fuzzy" | "unmatched";
  buyerCompanyName: string;
  buyerCompanyCity: string;
  buyerConfidence: "exact" | "fuzzy" | "unmatched";
  product: string;
  productConfidence: "exact" | "fuzzy" | "unmatched";
  qty: number;
  price: number;
  brokerageRate?: number;
  remarks?: string;
}

interface VoiceDictationDialogProps {
  companies: any[];
  products: any[];
  isAmit?: boolean;
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export function VoiceDictationDialog({
  companies = [],
  products = [],
  isAmit = false,
  onSuccess,
  triggerButton,
}: VoiceDictationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<string>("gu-IN"); // Gujarati default for commodity traders, supports en-IN, hi-IN
  const [transcript, setTranscript] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedRows, setExtractedRows] = useState<ParsedTransaction[]>([]);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Load stored Gemini API key from localStorage if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("omkar_gemini_api_key");
      if (stored) setGeminiApiKey(stored);
    }
  }, []);

  const saveGeminiKey = (key: string) => {
    setGeminiApiKey(key);
    if (typeof window !== "undefined") {
      if (key.trim()) {
        localStorage.setItem("omkar_gemini_api_key", key.trim());
      } else {
        localStorage.removeItem("omkar_gemini_api_key");
      }
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onresult = (event: any) => {
        let currentText = "";
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + " ";
        }
        setTranscript(currentText.trim());
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone permissions in your browser to use voice dictation.",
            variant: "destructive",
          });
        } else if (event.error === "network") {
          toast({
            title: "Speech Network Error",
            description: "Browser speech service could not reach Google servers. Check your connection or paste/type trade details directly.",
            variant: "destructive",
          });
        } else if (event.error !== "no-speech") {
          toast({
            title: "Dictation Error",
            description: `Speech recognition encountered an issue: ${event.error}`,
            variant: "destructive",
          });
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Could not setup speech recognition:", err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [language, toast]);

  const toggleListening = () => {
    if (!speechSupported) {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser does not support Web Speech API. You can type or paste trade text directly into the box.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = language;
          recognitionRef.current.start();
          setIsListening(true);
        }
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setIsListening(false);
      }
    }
  };

  const loadSampleTranscript = () => {
    const today = new Date().toISOString().split("T")[0];
    const sample = `Aaj no sauda: Radhe Trading e Ambika Agro ne 200 guni Jeera 2850 na bhav ma aapiyu. Bijo saudo: Krishna Traders e Patel Enterprise ne 500 guni Groundnut 1400 ma vechi, tariq ${today}.`;
    setTranscript(sample);
  };

  const handleExtract = async () => {
    if (!transcript.trim()) {
      toast({
        title: "No transcript provided",
        description: "Speak or paste transaction details first.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      const res = await fetch("/api/transactions/voice-parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiApiKey.trim() ? { "x-gemini-api-key": geminiApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          text: transcript,
          apiKey: geminiApiKey.trim() || undefined,
          companies: companies || [],
          products: products || [],
        }),
      });

      const responseText = await res.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned error (${res.status}): ${responseText.slice(0, 150)}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Failed to parse transactions with AI (${res.status}).`);
      }

      if (!data.transactions || data.transactions.length === 0) {
        toast({
          title: "No transactions detected",
          description: "Could not find any clear trade transactions in the speech. Try speaking clearly or check the format.",
          variant: "destructive",
        });
        return;
      }

      const rows: ParsedTransaction[] = data.transactions.map((tx: any) => ({
        ...tx,
        id: crypto.randomUUID(),
      }));

      setExtractedRows(rows);
      toast({
        title: `Extracted ${rows.length} transaction${rows.length === 1 ? "" : "s"}!`,
        description: "Review and verify the details in the table below before saving.",
      });
    } catch (err: any) {
      toast({
        title: "Extraction Failed",
        description: err.message || "An error occurred while contacting AI.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const updateRow = (id: string, field: keyof ParsedTransaction, value: any) => {
    setExtractedRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };

        // If company changed, auto-update city
        if (field === "sellerCompanyName") {
          const matched = companies.find(
            (c) =>
              (c.companyName || c["Company Name"] || "").toLowerCase() ===
              String(value).toLowerCase().trim(),
          );
          updated.sellerCompanyCity = matched ? (matched.companyCity || matched["City"] || "") : "";
          updated.sellerConfidence = matched ? "exact" : "unmatched";
        }
        if (field === "buyerCompanyName") {
          const matched = companies.find(
            (c) =>
              (c.companyName || c["Company Name"] || "").toLowerCase() ===
              String(value).toLowerCase().trim(),
          );
          updated.buyerCompanyCity = matched ? (matched.companyCity || matched["City"] || "") : "";
          updated.buyerConfidence = matched ? "exact" : "unmatched";
        }
        return updated;
      }),
    );
  };

  const deleteRow = (id: string) => {
    setExtractedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addManualRow = () => {
    const today = new Date().toISOString().split("T")[0];
    setExtractedRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: today,
        sellerCompanyName: companies[0]?.companyName || "",
        sellerCompanyCity: companies[0]?.companyCity || "",
        sellerConfidence: companies[0] ? "exact" : "unmatched",
        buyerCompanyName: companies[1]?.companyName || "",
        buyerCompanyCity: companies[1]?.companyCity || "",
        buyerConfidence: companies[1] ? "exact" : "unmatched",
        product: products[0]?.productName || "",
        productConfidence: products[0] ? "exact" : "unmatched",
        qty: 100,
        price: 1000,
        brokerageRate: 0,
        remarks: "",
      },
    ]);
  };

  const handleSaveAll = async () => {
    if (extractedRows.length === 0) return;

    // Validate that there are no unmatched companies
    const invalidCompanyRows = extractedRows.filter(
      (r) => r.sellerConfidence === "unmatched" || r.buyerConfidence === "unmatched",
    );

    if (invalidCompanyRows.length > 0) {
      toast({
        title: "Unmatched Companies Detected",
        description: "Please select valid companies from Company Master for all rows before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: extractedRows.map((r) => ({
            date: r.date,
            sellerCompanyName: r.sellerCompanyName,
            sellerCity: r.sellerCompanyCity,
            buyerCompanyName: r.buyerCompanyName,
            buyerCity: r.buyerCompanyCity,
            product: r.product,
            qty: Number(r.qty),
            price: Number(r.price),
            brokerageRate: Number(r.brokerageRate || 0),
            remarks: r.remarks || "",
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save transactions in batch.");
      }

      toast({
        title: "Transactions Saved!",
        description: `Successfully saved ${data.count || extractedRows.length} transactions to Google Sheets.`,
      });

      // Clear & Close
      setExtractedRows([]);
      setTranscript("");
      setIsOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Batch Save Failed",
        description: err.message || "An error occurred while writing rows.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnmatched = extractedRows.some(
    (r) => r.sellerConfidence === "unmatched" || r.buyerConfidence === "unmatched",
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="default" className="gap-2 shadow-sm">
            <Mic className="h-4 w-4 text-primary-foreground" />
            <span>Voice & AI Dictation</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto sm:p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">Voice & AI Transaction Dictation</DialogTitle>
                <DialogDescription className="text-xs">
                  Speak or paste transactions in Gujarati, Hindi, or English. AI automatically extracts and verifies against Master data.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={geminiApiKey ? "ghost" : "outline"}
                size="sm"
                className={`h-9 gap-1.5 text-xs ${
                  !geminiApiKey ? "border-amber-500/50 bg-amber-500/10 text-amber-600" : ""
                }`}
                onClick={() => setShowKeyInput(!showKeyInput)}
                title="Configure Gemini API Key"
              >
                <Key className="h-3.5 w-3.5" />
                <span>{geminiApiKey ? "API Key Set" : "Enter API Key"}</span>
              </Button>

              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gu-IN">ગુજરાતી (Gujarati)</SelectItem>
                  <SelectItem value="hi-IN">हिन्दी (Hindi)</SelectItem>
                  <SelectItem value="en-IN">English (India)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* API KEY INPUT ACCORDION / TOGGLE */}
          {showKeyInput && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">Gemini API Key (Saved in your browser):</span>
                <span className="text-[11px] text-muted-foreground">Stored only in your localStorage</span>
              </div>
              <div className="mt-1.5 flex gap-2">
                <Input
                  type="password"
                  placeholder="Paste your Gemini API key (AQ... or AIza...)"
                  value={geminiApiKey}
                  onChange={(e) => saveGeminiKey(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 shrink-0 text-xs"
                  onClick={() => {
                    setShowKeyInput(false);
                    toast({ title: "API Key saved in your browser" });
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* DICTATION / INPUT SECTION */}
        <div className="mt-3 space-y-3 rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isListening ? "destructive" : "default"}
                size="sm"
                className={`gap-2 transition-all ${
                  isListening ? "animate-pulse ring-2 ring-destructive ring-offset-2" : ""
                }`}
                onClick={toggleListening}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4" /> Stop Dictating
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" /> Start Dictating
                  </>
                )}
              </Button>

              {isListening && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <span className="h-2 w-2 rounded-full bg-destructive animate-ping" />
                  Listening live...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={loadSampleTranscript}
              >
                <HelpCircle className="mr-1 h-3.5 w-3.5" /> Load Example
              </Button>
              {transcript && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setTranscript("")}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Click 'Start Dictating' and speak, or paste text from WhatsApp/notes (e.g. Radhe Trading sold 200 bags Jeera to Ambika Agro at 2850 today)..."
            rows={3}
            className="text-sm resize-y"
          />

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleExtract}
              disabled={isExtracting || !transcript.trim()}
              className="gap-2"
            >
              {isExtracting ? (
                <>
                  <Spinner className="h-4 w-4" /> Extracting with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Extract & Verify Trades
                </>
              )}
            </Button>
          </div>
        </div>

        {/* STAGING & VERIFICATION TABLE */}
        {extractedRows.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div>
                <h3 className="font-semibold text-sm">
                  Extracted Trades ({extractedRows.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Review matched companies and values before saving to Google Sheets.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addManualRow}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add Row
              </Button>
            </div>

            {hasUnmatched && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Some companies could not be found in Company Master (highlighted in red). Please select an existing company from the dropdown before saving.
                </span>
              </div>
            )}

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[850px] text-xs">
                <thead className="bg-muted/70 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-medium">Date</th>
                    <th className="p-2 text-left font-medium">Seller Company</th>
                    <th className="p-2 text-left font-medium">Buyer Company</th>
                    <th className="p-2 text-left font-medium">Product</th>
                    <th className="p-2 text-left font-medium">Qty</th>
                    <th className="p-2 text-left font-medium">Price (₹)</th>
                    {isAmit && <th className="p-2 text-left font-medium">Rate</th>}
                    <th className="p-2 text-left font-medium">Remarks</th>
                    <th className="p-2 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {extractedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      {/* DATE */}
                      <td className="p-2 w-28">
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(row.id, "date", e.target.value)}
                          className="h-8 text-xs p-1"
                        />
                      </td>

                      {/* SELLER */}
                      <td className="p-2 min-w-[180px]">
                        <div className="space-y-1">
                          <select
                            value={row.sellerCompanyName}
                            onChange={(e) =>
                              updateRow(row.id, "sellerCompanyName", e.target.value)
                            }
                            className={`w-full h-8 rounded-md border text-xs px-2 bg-background ${
                              row.sellerConfidence === "unmatched"
                                ? "border-destructive text-destructive font-medium"
                                : "border-input"
                            }`}
                          >
                            {row.sellerConfidence === "unmatched" && (
                              <option value={row.sellerCompanyName}>
                                ⚠️ Unknown: {row.sellerCompanyName}
                              </option>
                            )}
                            {companies.map((c) => {
                              const name = c.companyName || c["Company Name"];
                              const city = c.companyCity || c["City"] || "";
                              return (
                                <option key={name} value={name}>
                                  {name} ({city})
                                </option>
                              );
                            })}
                          </select>
                          <div className="flex items-center gap-1">
                            {row.sellerConfidence === "exact" ? (
                              <Badge variant="outline" className="text-[10px] py-0 text-success border-success/30 bg-success/5">
                                <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Match
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] py-0">
                                Unmatched
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground truncate">
                              {row.sellerCompanyCity}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* BUYER */}
                      <td className="p-2 min-w-[180px]">
                        <div className="space-y-1">
                          <select
                            value={row.buyerCompanyName}
                            onChange={(e) =>
                              updateRow(row.id, "buyerCompanyName", e.target.value)
                            }
                            className={`w-full h-8 rounded-md border text-xs px-2 bg-background ${
                              row.buyerConfidence === "unmatched"
                                ? "border-destructive text-destructive font-medium"
                                : "border-input"
                            }`}
                          >
                            {row.buyerConfidence === "unmatched" && (
                              <option value={row.buyerCompanyName}>
                                ⚠️ Unknown: {row.buyerCompanyName}
                              </option>
                            )}
                            {companies.map((c) => {
                              const name = c.companyName || c["Company Name"];
                              const city = c.companyCity || c["City"] || "";
                              return (
                                <option key={name} value={name}>
                                  {name} ({city})
                                </option>
                              );
                            })}
                          </select>
                          <div className="flex items-center gap-1">
                            {row.buyerConfidence === "exact" ? (
                              <Badge variant="outline" className="text-[10px] py-0 text-success border-success/30 bg-success/5">
                                <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Match
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] py-0">
                                Unmatched
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground truncate">
                              {row.buyerCompanyCity}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* PRODUCT */}
                      <td className="p-2 min-w-[140px]">
                        <select
                          value={row.product}
                          onChange={(e) => updateRow(row.id, "product", e.target.value)}
                          className="w-full h-8 rounded-md border border-input text-xs px-2 bg-background"
                        >
                          {products.map((p) => {
                            const name = p.productName || p["Product Name"];
                            const code = p.productCode || p["Product Code"] || "";
                            return (
                              <option key={name || code} value={name || code}>
                                {name} {code ? `(${code})` : ""}
                              </option>
                            );
                          })}
                        </select>
                      </td>

                      {/* QTY */}
                      <td className="p-2 w-20">
                        <Input
                          type="number"
                          min="1"
                          value={row.qty}
                          onChange={(e) => updateRow(row.id, "qty", Number(e.target.value))}
                          className="h-8 text-xs p-1"
                        />
                      </td>

                      {/* PRICE */}
                      <td className="p-2 w-24">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.price}
                          onChange={(e) => updateRow(row.id, "price", Number(e.target.value))}
                          className="h-8 text-xs p-1"
                        />
                      </td>

                      {/* RATE (Amit) */}
                      {isAmit && (
                        <td className="p-2 w-16">
                          <Input
                            type="number"
                            step="0.1"
                            value={row.brokerageRate || 0}
                            onChange={(e) => updateRow(row.id, "brokerageRate", Number(e.target.value))}
                            className="h-8 text-xs p-1"
                          />
                        </td>
                      )}

                      {/* REMARKS */}
                      <td className="p-2 min-w-[120px]">
                        <Input
                          type="text"
                          value={row.remarks || ""}
                          placeholder="Remarks..."
                          onChange={(e) => updateRow(row.id, "remarks", e.target.value)}
                          className="h-8 text-xs p-1"
                        />
                      </td>

                      {/* DELETE */}
                      <td className="p-2 text-center w-12">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CONFIRM BUTTON */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{extractedRows.length} trades</span> ready to record.
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExtractedRows([])}
                >
                  Discard All
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving || hasUnmatched || extractedRows.length === 0}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Spinner className="h-4 w-4" /> Saving to Sheets...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Save {extractedRows.length} Trades to Sheets
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
