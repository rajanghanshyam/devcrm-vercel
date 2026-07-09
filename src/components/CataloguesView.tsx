/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  BookOpen, 
  Sparkles, 
  User, 
  Package, 
  FileText, 
  Printer, 
  Mail, 
  Share2, 
  CheckCircle, 
  Info, 
  Edit, 
  Download, 
  ArrowRight,
  Eye, 
  Megaphone,
  Loader2,
  Copy,
  Undo
} from "lucide-react";
import { Customer, Product, CompanySettings } from "../types";
import { EmailModal } from "./EmailModal";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Smartphone, Laptop } from "lucide-react";

interface CataloguesViewProps {
  customers: Customer[];
  products: Product[];
  companySettings: CompanySettings;
}

export default function CataloguesView({ customers, products, companySettings }: CataloguesViewProps) {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<"catalogue" | "advertising">("catalogue");
  
  // Preview configuration: standard layout or vertical mobile card structure
  const [previewLayout, setPreviewLayout] = useState<"standard" | "mobile">("standard");
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Global selections
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [customRates, setCustomRates] = useState<{ [productId: string]: number }>({});
  const [customDescriptions, setCustomDescriptions] = useState<{ [productId: string]: string }>({});

  // Multiple Price Lists states
  const [savedPriceLists, setSavedPriceLists] = useState<{
    id: string;
    name: string;
    selectedProductIds: string[];
    customRates: { [productId: string]: number };
    customDescriptions: { [productId: string]: string };
  }[]>(() => {
    try {
      const stored = localStorage.getItem("qm_saved_pricelists");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: "std_retail",
        name: "Standard Retail Tariffs",
        selectedProductIds: products.slice(0, 3).map(p => p.id),
        customRates: {},
        customDescriptions: {}
      },
      {
        id: "bulk_wholesale",
        name: "Dealer Wholesale Bulk List",
        selectedProductIds: products.slice(0, 4).map(p => p.id),
        customRates: products.reduce((acc, p) => ({ ...acc, [p.id]: Math.round(p.rate * 0.82) }), {}),
        customDescriptions: {}
      }
    ];
  });
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>("");
  const [newPriceListName, setNewPriceListName] = useState<string>("");

  // Email state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Advertising state
  const [selectedAdProductId, setSelectedAdProductId] = useState<string>("");
  const [adTheme, setAdTheme] = useState<string>("obsidian-gold");
  const [marketingTone, setMarketingTone] = useState<string>("Premium & Professional");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [adHeading, setAdHeading] = useState("Unmatched Performance, Redefined.");
  const [adSubheading, setAdSubheading] = useState("Heavy-Duty Professional Solutions Tailored to Your Workshop.");
  const [adHighlights, setAdHighlights] = useState<string[]>([
    "Precision-engineered with top benchmark durability specs",
    "Complete product reliability backed by corporate replacement warranty",
    "Tailored wholesale discounts available for bulk corporate dispatch"
  ]);
  const [adWhatsappText, setAdWhatsappText] = useState("");
  const [copiedNotification, setCopiedNotification] = useState(false);

  // customizable details for Ad Poster
  const [adCompanyLogoText, setAdCompanyLogoText] = useState(companySettings.name || "GLOBAL SOLUTIONS");
  const [adCompanyPhone, setAdCompanyPhone] = useState(companySettings.phone || "+91 98250 39020");
  const [adCompanyEmail, setAdCompanyEmail] = useState(companySettings.email || "support@industrial.in");
  const [adCompanyAddress, setAdCompanyAddress] = useState(companySettings.address || "Warehouse Zone 4, India");
  const [adCompanyWebsite, setAdCompanyWebsite] = useState("www.industryprime.com");
  const [adProductImageUrl, setAdProductImageUrl] = useState("https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop");

  // Base Customer selection helper
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0] || null;

  // Multi-select toggle for Catalogue products
  const handleProductToggle = (productId: string) => {
    setSelectedProductIds((prev) => {
      const isSelected = prev.includes(productId);
      if (isSelected) {
        return prev.filter(id => id !== productId);
      } else {
        const prod = products.find(p => p.id === productId);
        // Pre-fill initial rate if not set
        if (prod && customRates[productId] === undefined) {
          setCustomRates(prevRates => ({ ...prevRates, [productId]: prod.rate }));
        }
        if (prod && customDescriptions[productId] === undefined) {
          setCustomDescriptions(prevDesc => ({ ...prevDesc, [productId]: prod.description }));
        }
        return [...prev, productId];
      }
    });
  };

  const selectedCatalogueProducts = products.filter(p => selectedProductIds.includes(p.id));

  // Handle price custom updates
  const handleCustomRateChange = (productId: string, val: number) => {
    setCustomRates(prev => ({ ...prev, [productId]: val }));
  };

  // Handle custom product description overrides
  const handleCustomDescChange = (productId: string, val: string) => {
    setCustomDescriptions(prev => ({ ...prev, [productId]: val }));
  };

  // Select/load an existing pricing list
  const handleSelectPriceList = (listId: string) => {
    setSelectedPriceListId(listId);
    if (!listId) {
      setSelectedProductIds([]);
      setCustomRates({});
      setCustomDescriptions({});
      return;
    }
    const found = savedPriceLists.find(l => l.id === listId);
    if (found) {
      setSelectedProductIds(found.selectedProductIds);
      setCustomRates(found.customRates);
      setCustomDescriptions(found.customDescriptions);
    }
  };

  // Save current selection & rates as a new Price List
  const handleSaveNewPriceList = (nameVal: string) => {
    if (!nameVal.trim()) {
      alert("Please provide a name for this price list.");
      return;
    }
    const newListId = "plist_" + Date.now();
    const newList = {
      id: newListId,
      name: nameVal.trim(),
      selectedProductIds: [...selectedProductIds],
      customRates: { ...customRates },
      customDescriptions: { ...customDescriptions }
    };
    const updated = [newList, ...savedPriceLists];
    setSavedPriceLists(updated);
    localStorage.setItem("qm_saved_pricelists", JSON.stringify(updated));
    setSelectedPriceListId(newListId);
    setNewPriceListName("");
    alert(`Success: "${newList.name}" has been registered as an active price list!`);
  };

  // Delete an existing price list
  const handleDeletePriceList = (listId: string) => {
    if (!confirm("Are you sure you want to delete this price list permanently?")) return;
    const updated = savedPriceLists.filter(l => l.id !== listId);
    setSavedPriceLists(updated);
    localStorage.setItem("qm_saved_pricelists", JSON.stringify(updated));
    if (selectedPriceListId === listId) {
      setSelectedPriceListId("");
      setSelectedProductIds([]);
      setCustomRates({});
      setCustomDescriptions({});
    }
  };

  // Run Gemini Content Synthesis
  const handleGenerateAiAd = async () => {
    const targetProduct = products.find(p => p.id === selectedAdProductId);
    if (!targetProduct) {
      alert("Please select a target product to synthesize the poster copy!");
      return;
    }

    setIsAiGenerating(true);
    try {
      const response = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productName: targetProduct.name,
          sku: targetProduct.sku,
          rate: targetProduct.rate,
          description: targetProduct.description,
          theme: marketingTone
        })
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        const payload = resData.data;
        setAdHeading(payload.headline || `Premium ${targetProduct.name}`);
        setAdSubheading(payload.subheading || targetProduct.description);
        setAdHighlights(payload.highlights || [
          "Pre-tested precision specifications",
          "Includes priority client discount",
          "Full compliance with dispatch policy"
        ]);
        setAdWhatsappText(payload.whatsappText || "");
      } else {
        throw new Error(resData.error || "Generation endpoint did not return data.");
      }
    } catch (err: any) {
      console.warn("Using smart fallback generator:", err.message);
      // Premium offline fallback generator
      setAdHeading(`Elite ${targetProduct.name} Series`);
      setAdSubheading(`Engineered with premium durability to elevate your industrial operations.`);
      setAdHighlights([
        `Ultra precision tolerance specs and customized modular architecture`,
        `Special discounted price of INR ${targetProduct.rate.toLocaleString()} inclusive of taxes`,
        `Includes direct company guarantee and expedited priority dispatch`
      ]);
      setAdWhatsappText(
        `*✨ Product Showcase: ${targetProduct.name.toUpperCase()} ✨*\n\nMaximize your team's output with our flagship engineered solution.\n\n*Key Highlights:*\n✅ Heavy Duty Specification Build\n✅ Priority Dispatch & Warranty Cover\n✅ Promo Investment: *INR ${targetProduct.rate.toLocaleString()}/-* only\n\n💬 _Reply directly to this WhatsApp message to secure your delivery list!_`
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  // WhatsApp catalogue generator
  const getShareCatalogueText = () => {
    const custName = selectedCustomer ? selectedCustomer.name : "Valued Customer";
    let text = `*📋 PROFESSIONAL PRODUCT CATALOGUE & PRICE LIST *\n`;
    text += `Hello ${custName},\n\nWe are sharing our custom selection catalogue compiled exclusively for you. Please review our price quotes:\n\n`;

    selectedCatalogueProducts.forEach((p, idx) => {
      const rate = customRates[p.id] !== undefined ? customRates[p.id] : p.rate;
      const desc = customDescriptions[p.id] || p.description;
      text += `${idx + 1}. *${p.name}*\n`;
      if (p.sku) text += `   SKU: ${p.sku}\n`;
      text += `   Special Quote: *INR ${rate.toLocaleString()}* (GST: ${p.gstRate}%)\n`;
      text += `   Details: _${desc}_\n\n`;
    });

    if (companySettings.name) {
      text += `Offer issued by *${companySettings.name}*.\n`;
    }
    text += `💬 *Please reply back to confirm your order or request changes!*`;
    return text;
  };

  // Safe WhatsApp dispatch trigger
  const handleSendToWhatsapp = (customText?: string) => {
    const defaultText = customText || getShareCatalogueText();
    const phone = selectedCustomer ? selectedCustomer.phone : "";
    const cleanPhone = phone.replace(/[^0-9]/g, ""); // clear helper spaces/operators
    
    // Construct standard URL
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone ? cleanPhone : ""}&text=${encodeURIComponent(defaultText)}`;
    window.open(url, "_blank");
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Export active preview format to clean standalone high-res PNG image with fit boundaries (no blank spaces)
  const handleDownloadPriceListPng = async () => {
    const printElement = document.getElementById('printable-area-container');
    if (!printElement) {
      alert("Preview container not found!");
      return;
    }
    setIsGeneratingPng(true);
    try {
      const imgData = await toPng(printElement, {
        quality: 0.99,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
      });
      const link = document.createElement("a");
      link.download = `PriceList_${previewLayout === "mobile" ? "Mobile_" : "Standard_"}${new Date().toISOString().split('T')[0]}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error("Failed to generate image:", err);
      alert("Error generating Image. Please try again.");
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // Download active price list layout directly as fit-to-page PDF with no blank space:
  const handleDownloadPriceListPdf = async () => {
    const printElement = document.getElementById('printable-area-container');
    if (!printElement) {
      alert("Preview container not found!");
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const imgData = await toPng(printElement, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvasWidth = img.width;
      const canvasHeight = img.height;

      const pdfWidth = 595.28; // standard width in pt
      const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;

      // Fit to page perfectly by customizing the PDF size to the actual canvas height ratio!
      // This leaves absolutely no blank margins or extra blank pages!
      const pdf = new jsPDF('p', 'pt', [pdfWidth, pdfHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      pdf.save(`PriceList_${previewLayout === "mobile" ? "Mobile_" : "Standard_"}${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Error compiling PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleGenerateAIImage = async () => {
    const activeProd = products.find(p => p.id === selectedAdProductId);
    if (!activeProd) return;

    setIsGeneratingImage(true);
    try {
      const response = await fetch('/api/marketing/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: activeProd.name })
      });
      const resData = await response.json();
      if (resData.success) {
        setAdProductImageUrl(resData.imageUrl);
      } else {
        alert("Generative AI image creation failed. Verify your connection or try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Generative AI image generation error.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="catalogues-module-root">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Catalogues & Marketing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create professional selected catalogues for clients or synthesize eye-catching advertising posters with real-time WhatsApp sharing options.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-150 p-1 rounded-xl shadow-inner shrink-0 border border-slate-200">
          <button
            onClick={() => setActiveSubTab("catalogue")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "catalogue"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            Professional Catalogues
          </button>
          <button
            onClick={() => setActiveSubTab("advertising")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "advertising"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Advertising Posters
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {activeSubTab === "catalogue" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Controls Side (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Customer Picker Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">1. Select Target Customer</h3>
                  <p className="text-[11px] text-slate-400">Choose custom recipient for the catalogue pricing list</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Target Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-slate-800 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                >
                  <option value="">-- Click to pick customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company || "Individual"})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/40 text-xs text-slate-600 space-y-1.5 leading-relaxed font-sans">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">Company:</span>
                    <span>{selectedCustomer.company || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">Email Address:</span>
                    <span>{selectedCustomer.email || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">Mobile Phone:</span>
                    <span className="font-mono">{selectedCustomer.phone || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">State / Region:</span>
                    <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                      {selectedCustomer.state || "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Multiple Price Lists Options Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">Active Price List Preset</h3>
                  <p className="text-[11px] text-slate-400">Save & load custom pricing lists across items</p>
                </div>
              </div>

              {/* Load preset selector */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Select Active Price List
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedPriceListId}
                    onChange={(e) => handleSelectPriceList(e.target.value)}
                    className="flex-1 text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Custom Manual Selections --</option>
                    {savedPriceLists.map((plist) => (
                      <option key={plist.id} value={plist.id}>
                        🏷️ {plist.name} ({plist.selectedProductIds.length} Products)
                      </option>
                    ))}
                  </select>
                  {selectedPriceListId && selectedPriceListId !== "std_retail" && selectedPriceListId !== "bulk_wholesale" && (
                    <button
                      type="button"
                      onClick={() => handleDeletePriceList(selectedPriceListId)}
                      className="px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-250 text-xs font-bold transition-all cursor-pointer"
                      title="Delete this custom pricing list option permanently"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Save current pricing state as new option */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Save Selections as a New Price List
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. VIP Client Tariffs 2026..."
                    value={newPriceListName}
                    onChange={(e) => setNewPriceListName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveNewPriceList(newPriceListName)}
                    disabled={selectedProductIds.length === 0}
                    className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-40"
                  >
                    Save As Preset
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">This will bundle the currently checked {selectedProductIds.length} products and their custom pricing overrides.</p>
              </div>
            </div>

            {/* Products checklists with override rates */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">2. Select Catalogue Products</h3>
                  <p className="text-[11px] text-slate-400">Check products to include, override descriptions & rates</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {products.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 font-medium">No products or services found.</p>
                ) : (
                  products.map((p) => {
                    const isChecked = selectedProductIds.includes(p.id);
                    return (
                      <div 
                        key={p.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                          isChecked 
                            ? "border-emerald-500/40 bg-emerald-50/20" 
                            : "border-slate-100 hover:border-slate-200 bg-slate-50/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleProductToggle(p.id)}
                          className="mt-1 accent-emerald-600 rounded cursor-pointer"
                          id={`check-catalog-${p.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`check-catalog-${p.id}`}
                            className="text-xs font-bold text-slate-800 cursor-pointer block truncate"
                          >
                            {p.name}
                          </label>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                            <span className="font-mono bg-slate-100 px-1 py-0.2 rounded font-semibold text-slate-600">SKU: {p.sku}</span>
                            <span>|</span>
                            <span>Rate: INR {p.rate.toLocaleString()}</span>
                            <span>|</span>
                            <span>GST: {p.gstRate}%</span>
                          </div>
                          
                          {/* Checked override block */}
                          {isChecked && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                              <div>
                                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Custom Rate (INR)</label>
                                <input
                                  type="number"
                                  value={customRates[p.id] !== undefined ? customRates[p.id] : p.rate}
                                  onChange={(e) => handleCustomRateChange(p.id, Number(e.target.value))}
                                  className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Custom Description</label>
                                <textarea
                                  value={customDescriptions[p.id] !== undefined ? customDescriptions[p.id] : p.description}
                                  onChange={(e) => handleCustomDescChange(p.id, e.target.value)}
                                  className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white h-12 text-slate-700 resize-none leading-normal"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Share Template Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-slate-700 tracking-wide uppercase">WhatsApp Dispatch Template</h4>
              <p className="text-[11px] text-slate-400">Instantly share this customer pricing compiled summary to their registered WhatsApp node.</p>
              
              <div className="flex gap-2">
                <button
                  disabled={selectedProductIds.length === 0}
                  onClick={() => handleSendToWhatsapp()}
                  className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-bold leading-none hover:bg-emerald-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Direct Send on WA
                </button>
                <button
                  disabled={selectedProductIds.length === 0}
                  onClick={() => handleCopyText(getShareCatalogueText())}
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl px-3 flex items-center justify-center cursor-pointer transition-colors"
                  title="Copy formatted copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copiedNotification && (
                <div className="text-center py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-lg">
                  Copied formatted broadcast text to clipboard!
                </div>
              )}
            </div>

          </div>

          {/* Visual Catalogue Render Side (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
              {/* Actions Ribbon & Layout Selector */}
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-extrabold text-slate-700 tracking-wider uppercase flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    Layout Preview Mode
                  </span>
                  {/* Embedded Toggles */}
                  <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-300 mt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewLayout("standard")}
                      className={`px-3 py-1 rounded text-[11px] font-bold tracking-tight transition-all flex items-center gap-1 cursor-pointer ${
                        previewLayout === "standard"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-555 hover:text-slate-800"
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      Standard Corporate (A4 PDF)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewLayout("mobile")}
                      className={`px-3 py-1 rounded text-[11px] font-bold tracking-tight transition-all flex items-center gap-1 cursor-pointer ${
                        previewLayout === "mobile"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-555 hover:text-slate-800"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Compact Mobile (9:16 PNG / WA)
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={handleDownloadPriceListPng}
                    disabled={selectedProductIds.length === 0 || isGeneratingPng}
                    className="p-1.5 px-3 rounded-lg border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-40 text-[11px] font-bold flex items-center gap-1"
                    title="Export crisp presentation image with absolutely zero blank borders"
                  >
                    {isGeneratingPng ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating PNG...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        Download Image (PNG)
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadPriceListPdf}
                    disabled={selectedProductIds.length === 0 || isGeneratingPdf}
                    className="p-1.5 px-3 rounded-lg border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-40 text-[11px] font-bold flex items-center gap-1"
                    title="Fit page height dynamically to remove any blank extra pages"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Fitting PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        Download PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsEmailModalOpen(true)}
                    disabled={selectedProductIds.length === 0}
                    className="p-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer disabled:opacity-40 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email PDF
                  </button>
                  <button
                    onClick={triggerPrint}
                    disabled={selectedProductIds.length === 0}
                    className="p-1.5 rounded-lg border border-slate-250 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all cursor-pointer disabled:opacity-40"
                    title="Standard print options"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Printable Area Wrapper (id="printable-area-container" to integrate cleanly with EmailModal) */}
              <div 
                className="p-6 bg-slate-100/50 flex justify-center items-start overflow-x-auto select-text font-sans"
              >
                <div 
                  id="printable-area-container" 
                  className={`bg-white shadow-xs border border-slate-100 transition-all ${
                    previewLayout === "mobile" 
                      ? "w-[380px] p-5 space-y-5 rounded-2xl shrink-0" 
                      : "min-w-[620px] max-w-[800px] w-full p-8 space-y-6"
                  }`}
                >
                  {previewLayout === "standard" ? (
                    <>
                      {/* Standard Corporate Layout */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          {companySettings.name ? (
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{companySettings.name}</h2>
                          ) : (
                            <h2 className="text-xl font-black text-indigo-600 uppercase tracking-tight">CRAFTED PRICE LIST</h2>
                          )}
                          
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed max-w-[280px]">
                            {companySettings.address || "Main industrial complex zone"}<br/>
                            GSTIN: {companySettings.gstin || "MOCK_GST_N_001"} | Phone: {companySettings.phone || "+91 XXXXXXXX"}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="inline-block bg-indigo-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded tracking-widest leading-none mb-1.5 font-sans">
                            Product Catalogue & Quote
                          </span>
                          <p className="text-xs font-bold text-slate-800">Date: {new Date().toLocaleDateString('en-GB')}</p>
                          <p className="text-[10px] text-slate-500 mt-1">Validity: 15 Days from Issue</p>
                        </div>
                      </div>

                      {/* Customer Info Section Tag */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Compiled Exclusively For:</p>
                          <p className="font-extrabold text-slate-800 mt-0.5">{selectedCustomer?.name || "Premium Business Client"}</p>
                          <p className="text-slate-500 mt-0.2">{selectedCustomer?.company || "Corporate Partner Hub"}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Client Contact Details:</p>
                          <p className="font-semibold text-slate-700 mt-0.5">Phone: <span className="font-mono">{selectedCustomer?.phone || "N/A"}</span></p>
                          <p className="text-slate-500 mt-0.2">Email: {selectedCustomer?.email || "N/A"}</p>
                        </div>
                      </div>

                      {/* Catalogue Price Grid */}
                      <div className="space-y-3">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-300 text-slate-500 font-bold uppercase text-[9px] tracking-wider bg-slate-50/25">
                              <th className="py-2 px-1 w-8">#</th>
                              <th className="py-2 px-1">Product & Details</th>
                              <th className="py-2 px-1 w-20">HSN Code</th>
                              <th className="py-2 px-1 w-16 text-center">GST Rate</th>
                              <th className="py-2 px-1 w-28 text-right">Special Client Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedCatalogueProducts.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                                  No products checked. Please select products from the checklist on the left side panel to generate the preview list.
                                </td>
                              </tr>
                            ) : (
                              selectedCatalogueProducts.map((p, idx) => {
                                const rate = customRates[p.id] !== undefined ? customRates[p.id] : p.rate;
                                const desc = customDescriptions[p.id] || p.description;
                                return (
                                  <tr key={p.id} className="align-top hover:bg-slate-50/10">
                                    <td className="py-3 px-1 font-mono text-slate-400">{idx + 1}</td>
                                    <td className="py-3 px-1 space-y-0.5">
                                      <p className="font-extrabold text-slate-900 leading-normal">{p.name}</p>
                                      <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{desc}</p>
                                    </td>
                                    <td className="py-3 px-1 font-mono text-slate-600">{p.hsnCode || "N/A"}</td>
                                    <td className="py-3 px-1 text-center font-semibold text-slate-600">{p.gstRate}%</td>
                                    <td className="py-3 px-1 text-right font-extrabold text-indigo-700 text-sm">
                                      INR {rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Terms & Corporate Stamp */}
                      <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-[10px] text-slate-500">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-700 uppercase tracking-widest text-[9px]">Scope Notes & Conditions:</p>
                          <ul className="list-disc pl-3.5 space-y-0.5">
                            <li>FOB Dispatch points, freight charges extra at actual cost.</li>
                            <li>Goods once supplied strictly non-refundable or exchangeable.</li>
                            <li>Prices represent customized target client tariffs.</li>
                          </ul>
                        </div>
                        <div className="text-right flex flex-col justify-end items-end space-y-2">
                          <div className="h-10 w-24 border border-slate-200/50 rounded flex items-center justify-center bg-slate-50/50">
                            <span className="text-[8px] font-bold tracking-widest text-slate-300 uppercase">OFFICIAL SEAL</span>
                          </div>
                          <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[9px]">{companySettings.name || "Authorized Person"}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* MOBILE PREVIEW LAYOUT WITH MAXIMUM ACCENT DESIGN */}
                      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-5 space-y-4 shadow-xl border border-white/10 relative overflow-hidden text-left font-sans">
                        
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-[40px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-600/15 rounded-full blur-[30px] pointer-events-none" />

                        {/* Top banner */}
                        <div className="z-10 flex items-center justify-between border-b border-indigo-900/40 pb-3">
                          <div className="space-y-0.5">
                            <p className="text-[8px] uppercase tracking-widest font-black text-indigo-400">Official Mobile Dispatch</p>
                            <h2 className="text-sm font-black tracking-tight text-white uppercase">{companySettings.name || "OFFICIAL QUOTE"}</h2>
                          </div>
                          <span className="bg-indigo-600 text-white font-extrabold text-[8px] uppercase px-2 py-1 rounded tracking-wider leading-none">
                            Price List
                          </span>
                        </div>

                        {/* Recipient summary pill */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-indigo-400 font-bold">Client:</span>
                            <span className="font-extrabold text-white">{selectedCustomer?.name || "Premium Recipient"}</span>
                          </div>
                          {selectedCustomer?.company && (
                            <div className="text-[10px] text-slate-300 pl-4">{selectedCustomer.company}</div>
                          )}
                          <div className="text-[9px] text-slate-400 flex justify-between pt-1 border-t border-white/5">
                            <span>Phone: {selectedCustomer?.phone || "N/A"}</span>
                            <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
                          </div>
                        </div>

                        {/* Mobile product listing */}
                        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                          {selectedCatalogueProducts.length === 0 ? (
                            <p className="text-xs text-indigo-200 text-center py-6 font-medium bg-white/5 rounded-xl border border-dashed border-white/10">
                              Please check products to construct list.
                            </p>
                          ) : (
                            selectedCatalogueProducts.map((p, idx) => {
                              const rate = customRates[p.id] !== undefined ? customRates[p.id] : p.rate;
                              const desc = customDescriptions[p.id] || p.description;
                              return (
                                <div key={p.id} className="bg-slate-950/40 border border-indigo-900/30 rounded-xl p-3 flex flex-col justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="text-xs font-black text-white">{idx + 1}. {p.name}</span>
                                      <span className="text-[8px] font-mono bg-white/10 text-slate-300 px-1 py-0.2 rounded shrink-0">
                                        GST: {p.gstRate}%
                                      </span>
                                    </div>
                                    <p className="text-[9.5px] text-slate-400 leading-normal line-clamp-2">{desc}</p>
                                  </div>
                                  
                                  <div className="flex justify-between items-center bg-indigo-950/60 p-2 rounded-lg border border-indigo-900/40">
                                    <span className="text-[8px] uppercase tracking-wider text-indigo-400 font-bold">Wholesale Quote</span>
                                    <span className="text-xs font-extrabold font-mono text-white">
                                      ₹ {rate.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Simple Mobile Footer contact details block */}
                        <div className="border-t border-indigo-950/40 pt-3 flex flex-col gap-1 text-[8.5px] text-slate-400">
                          <div className="flex justify-between font-mono">
                            <span>📞 {companySettings.phone || "+91 XXXXXXXX"}</span>
                            <span>🌐 {companySettings.name ? companySettings.name.replace(/\s+/g,'').toLowerCase() + ".com" : "inventoryapp.com"}</span>
                          </div>
                          <p className="text-[8px] text-slate-500 text-center uppercase tracking-widest pt-1">
                            Validity: 15 Days • Subject to Standard Conditions
                          </p>
                        </div>

                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Email dispatch Modal integration */}
          <EmailModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            documentName="Corporate_Catalogue"
            customerEmail={selectedCustomer ? selectedCustomer.email : "rajanghanshyam@gmail.com"}
            defaultSubject={`Professional Catalog & Price Quote - ${companySettings.name || 'Our Company'}`}
            defaultBody={`Hello ${selectedCustomer ? selectedCustomer.name : 'Sir/Ma\'am'},\n\nWe have generated and enclosed our personalized corporate product catalogue and custom special rate list for your evaluation.\n\nPlease review the attached invoice-grade PDF format and get back to us at your earliest convenience to block dispatch allotments.\n\nWarm regards,\nSales Representative\n${companySettings.name || 'Sales App'}`}
          />

        </div>
      ) : (
        /* ADVERTISING POSTER SUITE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Ad Inputs and AI Controls (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="bg-indigo-50 text-indigo-100 p-2 rounded-xl">
                  <Megaphone className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">AI Poster Config</h3>
                  <p className="text-[11px] text-slate-400">Command ChatGPT/Gemini to write selling copies</p>
                </div>
              </div>

              {/* Product selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Select Product to Advertise</label>
                <select
                  value={selectedAdProductId}
                  onChange={(e) => setSelectedAdProductId(e.target.value)}
                  className="w-full text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pick Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Theme tone Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Poster Tone / Mood Prompt</label>
                <select
                  value={marketingTone}
                  onChange={(e) => setMarketingTone(e.target.value)}
                  className="w-full text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Premium & Professional">Premium & Professional</option>
                  <option value="Limited Stock / Urgent Appeal">Limited Stock / Urgent Appeal</option>
                  <option value="Incredible Value / Deep Discount">Incredible Value / Deep Discount</option>
                  <option value="Eco Friendly & Sustainable Vibe">Eco Friendly & Sustainable Vibe</option>
                  <option value="High Performance Heavy Engineering">High Performance Heavy Engineering</option>
                </select>
              </div>

              {/* Theme Visual palettes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Graphic Design Canvas Palette</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setAdTheme("obsidian-gold")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left border cursor-pointer transition-all ${
                      adTheme === "obsidian-gold"
                        ? "border-amber-500 bg-slate-900 text-amber-400 shadow-sm"
                        : "border-slate-150 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    👑 Luxury Obsidian
                  </button>
                  <button
                    onClick={() => setAdTheme("swiss-minimal")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left border cursor-pointer transition-all ${
                      adTheme === "swiss-minimal"
                        ? "border-rose-500 bg-white text-rose-600 shadow-sm"
                        : "border-slate-150 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    🇨🇭 Swiss Minimal
                  </button>
                  <button
                    onClick={() => setAdTheme("midnight-cyberpunk")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left border cursor-pointer transition-all ${
                      adTheme === "midnight-cyberpunk"
                        ? "border-pink-500 bg-slate-950 text-pink-400 shadow-sm"
                        : "border-slate-150 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    👾 Cyberpunk
                  </button>
                  <button
                    onClick={() => setAdTheme("festival-gold")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left border cursor-pointer transition-all ${
                      adTheme === "festival-gold"
                        ? "border-orange-500 bg-orange-950 text-orange-400 shadow-sm"
                        : "border-slate-150 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    🏮 Saffron Festival
                  </button>
                  <button
                    onClick={() => setAdTheme("casio-retro")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left border cursor-pointer transition-all ${
                      adTheme === "casio-retro"
                        ? "border-emerald-500 bg-zinc-900 text-emerald-400 shadow-sm"
                        : "border-slate-150 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    📟 Retro Electronics
                  </button>
                </div>
              </div>

              {/* Trigger Gemini block */}
              <button
                onClick={handleGenerateAiAd}
                disabled={isAiGenerating || !selectedAdProductId}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-extrabold uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-indigo-500/10 disabled:opacity-40"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synthesizing with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Assemble Ad Poster with AI
                  </>
                )}
              </button>
            </div>

            {/* Poster Manual Tweaker Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-slate-700 tracking-wide uppercase">Poster Text Editor</h4>
              <p className="text-[10px] text-slate-400">Directly tweak any of the generated text to hit the bullseye.</p>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase">Headline</label>
                <input
                  type="text"
                  value={adHeading}
                  onChange={(e) => setAdHeading(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg shrink-0 mt-1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase">Sub-Heading</label>
                <input
                  type="text"
                  value={adSubheading}
                  onChange={(e) => setAdSubheading(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg shrink-0 mt-1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase">Highlights Bullet 1</label>
                <input
                  type="text"
                  value={adHighlights[0] || ""}
                  onChange={(e) => setAdHighlights(p => [e.target.value, p[1] || "", p[2] || ""])}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg mt-1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase">Highlights Bullet 2</label>
                <input
                  type="text"
                  value={adHighlights[1] || ""}
                  onChange={(e) => setAdHighlights(p => [p[0] || "", e.target.value, p[2] || ""])}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg mt-1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase">Highlights Bullet 3</label>
                <input
                  type="text"
                  value={adHighlights[2] || ""}
                  onChange={(e) => setAdHighlights(p => [p[0] || "", p[1] || "", e.target.value])}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg mt-1"
                />
              </div>
            </div>

            {/* Poster Brand & Contact Details Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-slate-700 tracking-wide uppercase">Brand & Contact Details</h4>
              <p className="text-[10px] text-slate-400">These details will be featured dynamically printed on the mobile poster banner.</p>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Poster Company Logo / Brand Name</label>
                <input
                  type="text"
                  value={adCompanyLogoText}
                  onChange={(e) => setAdCompanyLogoText(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Phone Contact</label>
                  <input
                    type="text"
                    value={adCompanyPhone}
                    onChange={(e) => setAdCompanyPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Email Contact</label>
                  <input
                    type="text"
                    value={adCompanyEmail}
                    onChange={(e) => setAdCompanyEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Website link</label>
                  <input
                    type="text"
                    value={adCompanyWebsite}
                    onChange={(e) => setAdCompanyWebsite(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Physical Address</label>
                  <input
                    type="text"
                    value={adCompanyAddress}
                    onChange={(e) => setAdCompanyAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Product Image Selection & Upload */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                  <span>Feature Product Image</span>
                  <button
                    type="button"
                    onClick={handleGenerateAIImage}
                    disabled={isGeneratingImage || !selectedAdProductId}
                    className="flex bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] items-center gap-1 border border-amber-200 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {isGeneratingImage ? "Generating..." : "Auto Fetch with AI"}
                  </button>
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste Image URL or wait for AI..."
                      value={adProductImageUrl}
                      onChange={(e) => setAdProductImageUrl(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                    <label className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center justify-center shrink-0 uppercase tracking-widest">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setAdProductImageUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Preset quick select grids */}
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Or Quick Pick Preset Graphics:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAdProductImageUrl("https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop")}
                        className="border border-slate-200 rounded overflow-hidden aspect-video relative hover:scale-105 transition-transform cursor-pointer"
                      >
                        <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=80&auto=format&fit=crop" className="w-full h-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdProductImageUrl("https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop")}
                        className="border border-slate-200 rounded overflow-hidden aspect-video relative hover:scale-105 transition-transform cursor-pointer"
                      >
                        <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=80&auto=format&fit=crop" className="w-full h-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdProductImageUrl("https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=500&auto=format&fit=crop")}
                        className="border border-slate-200 rounded overflow-hidden aspect-video relative hover:scale-105 transition-transform cursor-pointer"
                      >
                        <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=80&auto=format&fit=crop" className="w-full h-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdProductImageUrl("https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=500&auto=format&fit=crop")}
                        className="border border-slate-200 rounded overflow-hidden aspect-video relative hover:scale-105 transition-transform cursor-pointer"
                      >
                        <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=80&auto=format&fit=crop" className="w-full h-full object-cover" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Visual Poster Mockup & Share Copy (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Poster design */}
            <div className="bg-slate-200/60 rounded-3xl border border-slate-250 p-4 md:p-8 flex justify-center items-center shadow-inner">
              
              {/* Smartphone Frame Mockup */}
              <div className="w-full max-w-[350px] aspect-[9/16] bg-slate-950 shadow-2xl rounded-[44px] p-3 border-8 border-slate-900 relative overflow-hidden flex flex-col justify-between">
                
                {/* Smartphone notch and top status */}
                <div className="absolute top-0 inset-x-0 h-6 flex justify-between items-center px-6 z-30 pointer-events-none text-[8px] font-mono text-white/50">
                  <span>9:41</span>
                  <div className="w-16 h-4 bg-slate-900 rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1">
                    <span className="w-3.5 h-1 bg-white/10 rounded" />
                    <span className="w-1 h-1 bg-amber-500 rounded-full" />
                  </div>
                  <span>5G 🔋</span>
                </div>

                {/* Main Dynamic Canvas containing the themes */}
                <div className="w-full h-full rounded-[30px] overflow-hidden relative flex flex-col justify-between pt-6 pb-4 px-4 text-xs font-sans">
                  
                  {/* LUXURY OBSIDIAN THEME */}
                  {adTheme === "obsidian-gold" && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col justify-between p-4 text-amber-200">
                      {/* Backlights */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-[30px] pointer-events-none" />

                      {/* Header Logo */}
                      <div className="z-10 flex justify-between items-center text-[8px] uppercase tracking-widest text-amber-400 font-bold border-b border-amber-800/20 pb-2">
                        <span>⭐ {adCompanyLogoText}</span>
                        <span>EXCLUSIVE MOBIL DISPATCH</span>
                      </div>

                      {/* Dynamic Product Image Slot */}
                      {adProductImageUrl && (
                        <div className="z-10 relative mt-2 w-full h-24 rounded-lg overflow-hidden border border-amber-500/20 shadow-lg bg-slate-950/40">
                          <img referrerPolicy="no-referrer" src={adProductImageUrl} className="w-full h-full object-cover" alt="Product Visual" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                        </div>
                      )}

                      {/* Heading Texts */}
                      <div className="z-10 space-y-1 mt-2">
                        <h3 className="text-sm font-black text-white leading-tight uppercase tracking-tight line-clamp-2">
                          {adHeading}
                        </h3>
                        <p className="text-[10px] text-amber-100/80 leading-relaxed italic line-clamp-2">
                          {adSubheading}
                        </p>
                      </div>

                      {/* Bullet Highlights */}
                      <div className="z-10 space-y-1.5 bg-slate-950/50 p-2 border border-amber-950 rounded-lg">
                        {adHighlights.map((hl, i) => hl && (
                          <div key={i} className="flex items-start gap-1 text-[9px]">
                            <span className="text-amber-400">✓</span>
                            <span className="text-slate-300 line-clamp-1">{hl}</span>
                          </div>
                        ))}
                      </div>

                      {/* Price tag */}
                      <div className="z-10 bg-gradient-to-r from-amber-600/20 to-amber-950/30 p-2 rounded-lg border border-amber-800/30 flex items-center justify-between">
                        <div>
                          <span className="block text-[7.5px] uppercase font-bold tracking-widest text-amber-400">Special Wholesale Offer</span>
                          <span className="text-[14px] font-black font-mono text-white">
                            ₹ {products.find(p => p.id === selectedAdProductId)?.rate.toLocaleString() || "ON REQ"}
                          </span>
                        </div>
                        <span className="bg-amber-400 text-slate-900 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Book Now</span>
                      </div>

                      {/* Brand Contact Details Footer */}
                      <div className="z-10 border-t border-amber-800/20 pt-2 flex flex-col space-y-1 text-[8px] text-slate-400">
                        <div className="flex justify-between">
                          <span>📞 {adCompanyPhone}</span>
                          <span>🌐 {adCompanyWebsite}</span>
                        </div>
                        <div className="flex justify-between items-center text-[7.5px] text-slate-450 border-t border-slate-800/30 pt-1">
                          <span className="truncate max-w-[130px]">✉️ {adCompanyEmail}</span>
                          <span className="truncate max-w-[130px]">📍 {adCompanyAddress}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SWISS MINIMAL THEME */}
                  {adTheme === "swiss-minimal" && (
                    <div className="absolute inset-0 bg-white flex flex-col justify-between p-4 text-slate-800">
                      {/* Red bar decor */}
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600" />

                      {/* Header Logo */}
                      <div className="z-10 pl-2 flex justify-between items-center text-[8px] uppercase tracking-widest text-rose-600 font-extrabold border-b border-slate-100 pb-2">
                        <span>🇨🇭 {adCompanyLogoText}</span>
                        <span>SWISS STYLE</span>
                      </div>

                      {/* Dynamic Product Image Slot */}
                      {adProductImageUrl && (
                        <div className="z-10 pl-2 relative mt-2 w-full h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <img referrerPolicy="no-referrer" src={adProductImageUrl} className="w-full h-full object-cover" alt="Product Visual" />
                        </div>
                      )}

                      {/* Heading Texts */}
                      <div className="z-10 pl-2 space-y-1 mt-2">
                        <h3 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight line-clamp-2">
                          {adHeading}
                        </h3>
                        <p className="text-[10px] text-slate-505 leading-normal line-clamp-2">
                          {adSubheading}
                        </p>
                      </div>

                      {/* Bullet Highlights */}
                      <div className="z-10 pl-2 space-y-1.5">
                        {adHighlights.map((hl, i) => hl && (
                          <div key={i} className="flex items-start gap-1 text-[9px] font-medium text-slate-700">
                            <span className="text-rose-600 font-bold">▪</span>
                            <span className="line-clamp-1">{hl}</span>
                          </div>
                        ))}
                      </div>

                      {/* Price tag */}
                      <div className="z-10 pl-2 mt-1 flex items-center justify-between border-t border-slate-100 pt-2">
                        <div>
                          <span className="block text-[7.5px] uppercase font-bold text-slate-400">Net Wholesale Base Price</span>
                          <span className="text-[14px] font-black text-rose-600 font-mono">
                            ₹ {products.find(p => p.id === selectedAdProductId)?.rate.toLocaleString() || "QUOTE"}
                          </span>
                        </div>
                        <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">FOB</span>
                      </div>

                      {/* Brand Contact Details Footer */}
                      <div className="z-10 pl-2 border-t border-slate-100 pt-2 flex flex-col space-y-1 text-[8px] text-slate-505 font-semibold">
                        <div className="flex justify-between">
                          <span>📞 {adCompanyPhone}</span>
                          <span>🌐 {adCompanyWebsite}</span>
                        </div>
                        <div className="flex justify-between items-center text-[7.5px] border-t border-slate-50 pt-1 text-slate-400">
                          <span className="truncate max-w-[130px]">✉️ {adCompanyEmail}</span>
                          <span className="truncate max-w-[130px]">📍 {adCompanyAddress}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MIDNIGHT CYBERPUNK THEME */}
                  {adTheme === "midnight-cyberpunk" && (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-4 text-pink-400">
                      {/* Backlights */}
                      <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/10 rounded-full blur-[40px] pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-28 h-28 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />

                      {/* Header Logo */}
                      <div className="z-10 flex justify-between items-center text-[8px] uppercase tracking-widest text-cyan-400 font-mono border-b border-pink-500/20 pb-2">
                        <span>⚡ {adCompanyLogoText} //</span>
                        <span>RESERVE: ONLINE</span>
                      </div>

                      {/* Dynamic Product Image Slot */}
                      {adProductImageUrl && (
                        <div className="z-10 relative mt-2 w-full h-24 rounded-lg overflow-hidden border border-pink-500/30 bg-slate-900 shadow-xl">
                          <img referrerPolicy="no-referrer" src={adProductImageUrl} className="w-full h-full object-cover" alt="Product Visual" />
                          <div className="absolute inset-0 bg-gradient-to-t from-pink-900/50 via-transparent to-transparent" />
                        </div>
                      )}

                      {/* Heading Texts */}
                      <div className="z-10 space-y-1 mt-2">
                        <h3 className="text-sm font-black text-white leading-tight uppercase tracking-widest line-clamp-2 bg-clip-text bg-gradient-to-r from-pink-550 to-indigo-400">
                          {adHeading}
                        </h3>
                        <p className="text-[10px] text-indigo-200 leading-normal line-clamp-2">
                          {adSubheading}
                        </p>
                      </div>

                      {/* Bullet Highlights */}
                      <div className="z-10 space-y-1.5 bg-slate-900/60 p-2 border border-pink-500/10 rounded-lg">
                        {adHighlights.map((hl, i) => hl && (
                          <div key={i} className="flex items-start gap-1 text-[9px] text-slate-300 font-mono">
                            <span className="text-pink-500">»</span>
                            <span className="line-clamp-1">{hl}</span>
                          </div>
                        ))}
                      </div>

                      {/* Price tag */}
                      <div className="z-10 border-t border-pink-500/20 pt-2 flex items-center justify-between">
                        <div>
                          <span className="block text-[7.5px] uppercase font-bold text-cyan-400 font-mono">W-NET PRICE VALUE</span>
                          <span className="text-[14px] font-black text-white font-mono">
                            ₹ {products.find(p => p.id === selectedAdProductId)?.rate.toLocaleString() || "N/A"}
                          </span>
                        </div>
                        <span className="bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-mono px-2 py-0.5 rounded text-[8px] font-black uppercase">SECURE</span>
                      </div>

                      {/* Brand Contact Footer */}
                      <div className="z-10 border-t border-pink-500/10 pt-2 flex flex-col space-y-1 text-[8px] text-slate-400 font-mono">
                        <div className="flex justify-between">
                          <span>📞 {adCompanyPhone}</span>
                          <span>🌐 {adCompanyWebsite}</span>
                        </div>
                        <div className="flex justify-between items-center text-[7px] border-t border-cyan-500/10 pt-1 text-slate-500">
                          <span className="truncate max-w-[130px]">✉️ {adCompanyEmail}</span>
                          <span className="truncate max-w-[130px]">📍 {adCompanyAddress}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SAFFRON FESTIVAL THEME */}
                  {adTheme === "festival-gold" && (
                    <div className="absolute inset-0 bg-amber-950 flex flex-col justify-between p-4 text-amber-250">
                      {/* Backlights */}
                      <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/10 rounded-full blur-[40px] pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-600/15 rounded-full blur-[30px] pointer-events-none" />

                      {/* Header Logo */}
                      <div className="z-10 flex justify-between items-center text-[8px] uppercase tracking-widest text-amber-400 font-bold border-b border-orange-500/20 pb-2">
                        <span>🏮 {adCompanyLogoText}</span>
                        <span>FESTIVE DEALS</span>
                      </div>

                      {/* Dynamic Product Image Slot */}
                      {adProductImageUrl && (
                        <div className="z-10 relative mt-2 w-full h-24 rounded-lg overflow-hidden border border-orange-500/25 bg-amber-950">
                          <img referrerPolicy="no-referrer" src={adProductImageUrl} className="w-full h-full object-cover" alt="Product Visual" />
                          <div className="absolute inset-0 bg-gradient-to-t from-amber-950/90 via-transparent to-transparent" />
                        </div>
                      )}

                      {/* Heading Texts */}
                      <div className="z-10 space-y-1 mt-2">
                        <h3 className="text-sm font-extrabold text-orange-200 leading-tight uppercase tracking-tight line-clamp-2">
                          {adHeading}
                        </h3>
                        <p className="text-[10px] text-amber-300 leading-normal italic line-clamp-2">
                          {adSubheading}
                        </p>
                      </div>

                      {/* Bullet Highlights */}
                      <div className="z-10 space-y-1.5 bg-orange-950/40 p-2 border border-orange-550/10 rounded-lg">
                        {adHighlights.map((hl, i) => hl && (
                          <div key={i} className="flex items-start gap-1 text-[9px]">
                            <span className="text-amber-400">✦</span>
                            <span className="text-amber-100 line-clamp-1">{hl}</span>
                          </div>
                        ))}
                      </div>

                      {/* Price tag */}
                      <div className="z-10 border-t border-orange-500/20 pt-2 flex items-center justify-between">
                        <div>
                          <span className="block text-[7.5px] uppercase font-bold text-amber-400">Festival Promo Deal</span>
                          <span className="text-[14px] font-black text-white font-mono">
                            ₹ {products.find(p => p.id === selectedAdProductId)?.rate.toLocaleString() || "CALL"}
                          </span>
                        </div>
                        <span className="bg-amber-500 text-amber-950 px-2 py-0.5 rounded text-[8px] font-black uppercase">SAVE NOW</span>
                      </div>

                      {/* Brand Contact Footer */}
                      <div className="z-10 border-t border-amber-900/40 pt-2 flex flex-col space-y-1 text-[8px] text-amber-300/70">
                        <div className="flex justify-between">
                          <span>📞 {adCompanyPhone}</span>
                          <span>🌐 {adCompanyWebsite}</span>
                        </div>
                        <div className="flex justify-between items-center text-[7.5px] border-t border-orange-950 pt-1 text-amber-400/50">
                          <span className="truncate max-w-[130px]">✉️ {adCompanyEmail}</span>
                          <span className="truncate max-w-[130px]">📍 {adCompanyAddress}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CASIO VINTAGE RETRO THEME */}
                  {adTheme === "casio-retro" && (
                    <div className="absolute inset-0 bg-stone-200 flex flex-col justify-between p-4 text-slate-800 font-sans border-b-8 border-stone-300 relative">
                      {/* Top Casio branding region */}
                      <div className="z-10 bg-blue-700/10 -mx-4 -mt-4 px-4 pt-4 pb-2 border-b-4 border-blue-600 flex justify-between items-end">
                        <div className="text-xl font-black italic tracking-tighter text-blue-700 leading-none">
                          {adCompanyLogoText.split(' ')[0] || "BRAND"}
                        </div>
                        <div className="text-[6px] uppercase tracking-widest text-slate-500 font-bold bg-white px-1.5 py-0.5 rounded-sm border border-slate-300">
                          {adCompanyLogoText}
                        </div>
                      </div>

                      {/* Heading Texts with strong grid layout */}
                      <div className="z-10 mt-3 relative">
                        <h3 className="text-xl font-black text-slate-900 leading-[0.9] uppercase tracking-tighter scale-y-110 origin-left">
                          {adHeading.split(' ')[0]} <br/> <span className="text-red-600">{adHeading.split(' ').slice(1).join(' ')}</span>
                        </h3>
                        {/* the blue NAME LAND tag */}
                        <div className="inline-flex bg-blue-600 text-white font-extrabold uppercase text-[7px] tracking-widest px-2 py-0.5 mt-2 rounded-r-md skew-x-[-12deg]">
                          <span className="skew-x-[12deg]">{adSubheading.substring(0, 20)}</span>
                        </div>
                      </div>

                      {/* Product Image Slot */}
                      {adProductImageUrl && (
                        <div className="z-10 relative mt-2 w-full h-32 rounded bg-white border border-slate-300 shadow flex items-center justify-center p-1">
                          <img referrerPolicy="no-referrer" src={adProductImageUrl} className="max-w-full max-h-full object-contain mix-blend-multiply" alt="Product Visual" />
                          <div className="absolute -bottom-2 -right-2 bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-[7px] font-black uppercase text-center leading-[0.95] rotate-[-15deg] shadow-lg border-2 border-white">
                            Top <br/> Choice
                          </div>
                        </div>
                      )}

                      {/* Feature Grid */}
                      <div className="z-10 mt-4 grid grid-cols-2 gap-1 gap-y-1.5">
                        {adHighlights.map((hl, i) => hl && (
                          <div key={i} className="flex items-start gap-1 text-[7px] leading-tight font-bold text-slate-700 bg-white p-1 pb-1.5 border-b border-t border-slate-300/50">
                            <span className="text-blue-600 font-black mt-0.5">▶</span>
                            <span className="line-clamp-2">{hl}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Price & Info Area */}
                      <div className="z-10 border border-slate-300 bg-white mt-auto p-1 text-center flex flex-col justify-center">
                        <span className="text-[7px] uppercase font-bold text-slate-400 tracking-wider">Manufacturer Price</span>
                        <span className="text-lg font-black text-zinc-800 leading-none">
                          ₹{products.find(p => p.id === selectedAdProductId)?.rate.toLocaleString() || "CALL"}
                        </span>
                      </div>

                      {/* Brand Contact Footer */}
                      <div className="z-10 flex flex-col space-y-0.5 text-[6.5px] text-slate-500 font-bold tracking-tight text-center mt-2">
                        <div>📞 Phone: {adCompanyPhone} / 🌐 {adCompanyWebsite}</div>
                        <div className="opacity-70 truncate">✉️ {adCompanyEmail} / 📍 {adCompanyAddress}</div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Generated Social/Whatsapp Share copy */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest">WhatsApp Promotional Copy</h4>
                  <p className="text-[11px] text-slate-400">Perfectly customized copy with promotional tags and price anchors.</p>
                </div>
                {adWhatsappText && (
                  <button
                    onClick={() => handleCopyText(adWhatsappText)}
                    className="p-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Text
                  </button>
                )}
              </div>

              {adWhatsappText ? (
                <div className="space-y-4">
                  <textarea
                    value={adWhatsappText}
                    onChange={(e) => setAdWhatsappText(e.target.value)}
                    className="w-full text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs leading-relaxed h-36 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  
                  <div className="flex flex-col md:flex-row gap-3">
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="text-slate-800 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                    >
                      <option value="">-- Click to pick customer (for phone lookup) --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          Share with: {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleSendToWhatsapp(adWhatsappText)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs py-2 px-4 flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Send Selected Customer on WhatsApp
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  Please pick a target product and click the <strong>Assemble Ad Poster with AI</strong> button above. The actual Gemini model will compile a stellar promotional brief and a high-converting broadcast message instantly.
                </p>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
