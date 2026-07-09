import { prisma } from './db';

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function saveToPrisma(payload: any) {
  await prisma.$transaction(async (tx) => {
    // 1. Detect if this is a full restore or full seed
    const isFullSave = payload.company_profiles !== undefined &&
                       payload.customers !== undefined &&
                       payload.products !== undefined &&
                       payload.inventory !== undefined &&
                       payload.quotations !== undefined;

    if (isFullSave) {
      console.log("Full save detected. Wiping existing records first to ensure consistency.");
      await tx.inventoryLogs.deleteMany();
      await tx.inventoryItems.deleteMany();
      await tx.quotationItems.deleteMany();
      await tx.invoiceItems.deleteMany();
      await tx.deliveryChallanItems.deleteMany();
      await tx.reminders.deleteMany();
      await tx.subscriptions.deleteMany();
      await tx.leads.deleteMany();
      await tx.deliveryChallans.deleteMany();
      await tx.invoices.deleteMany();
      await tx.quotations.deleteMany();
      await tx.products.deleteMany();
      await tx.customers.deleteMany();
      await tx.subscriptionPolicies.deleteMany();
      await tx.termsPresets.deleteMany();
      await tx.companyProfiles.deleteMany();
    }

    // Dynamic sets to track existences for foreign key check in non-full-save or fallback
    const companyIds = new Set<string>();
    const termsPresetIds = new Set<string>();
    const customerIds = new Set<string>();
    const productIds = new Set<string>();
    const productSkus = new Set<string>();
    const inventorySkus = new Set<string>();
    const quotationIds = new Set<string>();
    const quotationNos = new Set<string>();
    const subscriptionIds = new Set<string>();

    // Pre-populate sets from DB for referential integrity during partial updates
    if (!isFullSave) {
      const dbCompanies = await tx.companyProfiles.findMany({ select: { id: true } });
      dbCompanies.forEach(c => companyIds.add(c.id));

      const dbTerms = await tx.termsPresets.findMany({ select: { id: true } });
      dbTerms.forEach(t => termsPresetIds.add(t.id));

      const dbCustomers = await tx.customers.findMany({ select: { id: true } });
      dbCustomers.forEach(c => customerIds.add(c.id));

      const dbProducts = await tx.products.findMany({ select: { id: true, sku: true } });
      dbProducts.forEach(p => {
        productIds.add(p.id);
        if (p.sku) productSkus.add(p.sku.toUpperCase().trim());
      });

      const dbQuotations = await tx.quotations.findMany({ select: { id: true, quotationNo: true } });
      dbQuotations.forEach(q => {
        quotationIds.add(q.id);
        if (q.quotationNo) quotationNos.add(q.quotationNo);
      });

      const dbSubscriptions = await tx.subscriptions.findMany({ select: { id: true } });
      dbSubscriptions.forEach(s => subscriptionIds.add(s.id));
    }

    // 2. Save Company Profiles
    if (payload.company_profiles !== undefined) {
      const incomingIds = payload.company_profiles.map((cp: any) => cp.id);
      
      // Delete terms presets first to allow profile cascade/replacement
      await tx.termsPresets.deleteMany({
        where: { companyProfileId: { in: incomingIds } }
      });

      for (const cp of payload.company_profiles || []) {
        companyIds.add(cp.id);
        await tx.companyProfiles.upsert({
          where: { id: cp.id },
          update: {
            name: cp.name,
            email: cp.email || "",
            phone: cp.phone,
            address: cp.address,
            gstin: cp.gstin,
            pan: cp.pan,
            state: cp.state,
            bankName: cp.bankName,
            bankBranch: cp.bankBranch,
            accountNo: cp.accountNo,
            ifsc: cp.ifsc,
            headerImage: cp.headerImage,
            footerImage: cp.footerImage,
            signatureImage: cp.signatureImage,
            template: cp.template,
            quotationPrefix: cp.quotationPrefix,
            invoicePrefix: cp.invoicePrefix,
            challanPrefix: cp.challanPrefix,
            nextQuotationNumber: cp.nextQuotationNumber || 1,
            nextInvoiceNumber: cp.nextInvoiceNumber || 1,
            nextChallanNumber: cp.nextChallanNumber || 1,
            enableGst: cp.enableGst !== undefined ? cp.enableGst : true,
            profitWithoutGst: cp.profitWithoutGst !== undefined ? cp.profitWithoutGst : true,
          },
          create: {
            id: cp.id,
            name: cp.name,
            email: cp.email || "",
            phone: cp.phone,
            address: cp.address,
            gstin: cp.gstin,
            pan: cp.pan,
            state: cp.state,
            bankName: cp.bankName,
            bankBranch: cp.bankBranch,
            accountNo: cp.accountNo,
            ifsc: cp.ifsc,
            headerImage: cp.headerImage,
            footerImage: cp.footerImage,
            signatureImage: cp.signatureImage,
            template: cp.template,
            quotationPrefix: cp.quotationPrefix,
            invoicePrefix: cp.invoicePrefix,
            challanPrefix: cp.challanPrefix,
            nextQuotationNumber: cp.nextQuotationNumber || 1,
            nextInvoiceNumber: cp.nextInvoiceNumber || 1,
            nextChallanNumber: cp.nextChallanNumber || 1,
            enableGst: cp.enableGst !== undefined ? cp.enableGst : true,
            profitWithoutGst: cp.profitWithoutGst !== undefined ? cp.profitWithoutGst : true,
          }
        });

        for (const tp of cp.termsPresets || []) {
          termsPresetIds.add(tp.id);
          await tx.termsPresets.create({
            data: {
              id: tp.id,
              companyProfileId: cp.id,
              title: tp.title,
              content: tp.content
            }
          });
        }
      }

      // Delete profiles not in payload
      const existing = await tx.companyProfiles.findMany({ select: { id: true } });
      for (const ep of existing) {
        if (!incomingIds.includes(ep.id)) {
          try {
            await tx.companyProfiles.delete({ where: { id: ep.id } });
          } catch (e) {
            console.warn(`Could not delete unused company profile ${ep.id}:`, e);
          }
        }
      }
    }

    // 3. Save Customers
    if (payload.customers !== undefined) {
      const incomingIds = payload.customers.map((c: any) => c.id);
      for (const cust of payload.customers || []) {
        customerIds.add(cust.id);
        await tx.customers.upsert({
          where: { id: cust.id },
          update: {
            name: cust.name,
            company: cust.company,
            email: cust.email,
            phone: cust.phone,
            gstin: cust.gstin,
            state: cust.state || "Maharashtra",
            billingAddress: cust.billingAddress,
            shippingAddress: cust.shippingAddress
          },
          create: {
            id: cust.id,
            name: cust.name,
            company: cust.company,
            email: cust.email,
            phone: cust.phone,
            gstin: cust.gstin,
            state: cust.state || "Maharashtra",
            billingAddress: cust.billingAddress,
            shippingAddress: cust.shippingAddress
          }
        });
      }

      // Delete customers not in payload
      const existing = await tx.customers.findMany({ select: { id: true } });
      for (const ec of existing) {
        if (!incomingIds.includes(ec.id)) {
          try {
            await tx.customers.delete({ where: { id: ec.id } });
          } catch (e) {
            console.warn(`Could not delete customer ${ec.id} (might be referenced):`, e);
          }
        }
      }
    }

    // 4. Save Products
    if (payload.products !== undefined) {
      // Use a Map of sku -> id to track existing products in the DB for conflicts
      const currentProductsMap = new Map<string, string>();
      const dbProducts = await tx.products.findMany({ select: { id: true, sku: true } });
      dbProducts.forEach(p => {
        if (p.sku) currentProductsMap.set(p.sku.toUpperCase().trim(), p.id);
      });

      const incomingIds = payload.products.map((p: any) => p.id);
      for (const prod of payload.products || []) {
        productIds.add(prod.id);
        let prodSku = prod.sku ? prod.sku.toUpperCase().trim() : "";
        if (!prodSku) {
          prodSku = `SKU_${prod.id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
        }
        
        let finalProdSku = prodSku;
        let counter = 1;
        while (true) {
          const owningId = currentProductsMap.get(finalProdSku);
          if (!owningId || owningId === prod.id) {
            break;
          }
          finalProdSku = `${prodSku}_${counter}`;
          counter++;
        }
        currentProductsMap.set(finalProdSku, prod.id);

        await tx.products.upsert({
          where: { id: prod.id },
          update: {
            name: prod.name || "Unnamed Product",
            sku: finalProdSku,
            rate: prod.rate || 0,
            gstRate: prod.gstRate || 18,
            hsnCode: prod.hsnCode,
            description: prod.description,
            itemType: prod.itemType,
            mrp: prod.mrp,
            lastPurchasePrice: prod.lastPurchasePrice,
            sellPrice: prod.sellPrice
          },
          create: {
            id: prod.id,
            name: prod.name || "Unnamed Product",
            sku: finalProdSku,
            rate: prod.rate || 0,
            gstRate: prod.gstRate || 18,
            hsnCode: prod.hsnCode,
            description: prod.description,
            itemType: prod.itemType,
            mrp: prod.mrp,
            lastPurchasePrice: prod.lastPurchasePrice,
            sellPrice: prod.sellPrice
          }
        });
      }

      // Delete products not in payload
      const existing = await tx.products.findMany({ select: { id: true } });
      for (const ep of existing) {
        if (!incomingIds.includes(ep.id)) {
          try {
            await tx.products.delete({ where: { id: ep.id } });
          } catch (e) {
            console.warn(`Could not delete product ${ep.id} (might be referenced):`, e);
          }
        }
      }
    }

    // 5. Save Inventory
    if (payload.inventory !== undefined) {
      // Re-populate products map from database to ensure up-to-date SKUs and IDs
      const currentProductsMap = new Map<string, string>();
      const dbProducts = await tx.products.findMany({ select: { id: true, sku: true } });
      dbProducts.forEach(p => {
        if (p.sku) currentProductsMap.set(p.sku.toUpperCase().trim(), p.id);
      });

      // Use a Map of sku -> id to track existing inventory items in the DB for conflicts
      const currentInventoryMap = new Map<string, string>();
      const dbInventory = await tx.inventoryItems.findMany({ select: { id: true, sku: true } });
      dbInventory.forEach(inv => {
        if (inv.sku) currentInventoryMap.set(inv.sku.toUpperCase().trim(), inv.id);
      });

      const incomingIds = payload.inventory.map((inv: any) => inv.id);
      for (const inv of payload.inventory || []) {
        let invSku = inv.sku ? inv.sku.toUpperCase().trim() : "";
        if (!invSku) {
          invSku = `SKU_INV_${inv.id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
        }

        let finalInvSku = invSku;
        let counter = 1;
        while (true) {
          const owningId = currentInventoryMap.get(finalInvSku);
          if (!owningId || owningId === inv.id) {
            break;
          }
          finalInvSku = `${invSku}_${counter}`;
          counter++;
        }
        currentInventoryMap.set(finalInvSku, inv.id);

        // Create a matching product if it does not exist to satisfy the foreign key constraint
        if (!currentProductsMap.has(finalInvSku)) {
          const placeholderProdId = `prod_placeholder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await tx.products.create({
            data: {
              id: placeholderProdId,
              name: inv.productName || `Product for SKU ${finalInvSku}`,
              sku: finalInvSku,
              rate: inv.unitPrice || 0,
              gstRate: 18,
              description: "Automatically created placeholder product for inventory item"
            }
          });
          currentProductsMap.set(finalInvSku, placeholderProdId);
          productIds.add(placeholderProdId);
        }

        await tx.inventoryItems.upsert({
          where: { id: inv.id },
          update: {
            sku: finalInvSku,
            productName: inv.productName || "Product",
            category: inv.category,
            quantity: inv.quantity || 0,
            minQuantity: inv.minQuantity || 0,
            purchaseFrom: inv.purchaseFrom,
            unitPrice: inv.unitPrice || 0,
            latestPurchasePrice: inv.latestPurchasePrice,
            lastUpdated: parseDate(inv.lastUpdated) || new Date()
          },
          create: {
            id: inv.id,
            sku: finalInvSku,
            productName: inv.productName || "Product",
            category: inv.category,
            quantity: inv.quantity || 0,
            minQuantity: inv.minQuantity || 0,
            purchaseFrom: inv.purchaseFrom,
            unitPrice: inv.unitPrice || 0,
            latestPurchasePrice: inv.latestPurchasePrice,
            lastUpdated: parseDate(inv.lastUpdated) || new Date()
          }
        });

        // Always replace logs to keep consistency
        await tx.inventoryLogs.deleteMany({
          where: { inventoryItemId: inv.id }
        });

        for (const log of inv.logs || []) {
          await tx.inventoryLogs.create({
            data: {
              id: log.id || "log_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now(),
              inventoryItemId: inv.id,
              date: parseDate(log.date) || new Date(),
              type: log.type,
              quantity: log.quantity || 0,
              reason: log.reason,
              prevQty: log.prevQty || 0,
              newQty: log.newQty || 0,
              supplierName: log.supplierName,
              customerName: log.customerName
            }
          });
        }
      }

      // Delete inventory items not in payload
      const existing = await tx.inventoryItems.findMany({ select: { id: true } });
      for (const ei of existing) {
        if (!incomingIds.includes(ei.id)) {
          try {
            await tx.inventoryLogs.deleteMany({ where: { inventoryItemId: ei.id } });
            await tx.inventoryItems.delete({ where: { id: ei.id } });
          } catch (e) {
            console.warn(`Could not delete inventory item ${ei.id}:`, e);
          }
        }
      }
    }

    // 6. Save Quotations
    if (payload.quotations !== undefined) {
      const incomingIds = payload.quotations.map((q: any) => q.id);

      // Clean up existing quotation items for the updated quotations to prevent orphans
      await tx.quotationItems.deleteMany({
        where: { quotationId: { in: incomingIds } }
      });

      for (const qt of payload.quotations || []) {
        quotationIds.add(qt.id);
        if (qt.quotationNo) {
          quotationNos.add(qt.quotationNo);
        }

        // Ensure customer exists
        let qCustId = qt.customerId;
        if (!customerIds.has(qCustId)) {
          await tx.customers.create({
            data: {
              id: qCustId,
              name: "Placeholder Customer",
              state: "Maharashtra"
            }
          });
          customerIds.add(qCustId);
        }

        await tx.quotations.upsert({
          where: { id: qt.id },
          update: {
            quotationNo: qt.quotationNo,
            date: parseDate(qt.date) || new Date(),
            validUntil: parseDate(qt.validUntil),
            customerId: qCustId,
            subject: qt.subject,
            subtotal: qt.subtotal || 0,
            discountTotal: qt.discountTotal || 0,
            cgstTotal: qt.cgstTotal || 0,
            sgstTotal: qt.sgstTotal || 0,
            igstTotal: qt.igstTotal || 0,
            grandTotal: qt.grandTotal || 0,
            status: qt.status,
            terms: qt.terms,
            companyId: (qt.companyId && companyIds.has(qt.companyId)) ? qt.companyId : null,
            termsPresetId: (qt.termsPresetId && termsPresetIds.has(qt.termsPresetId)) ? qt.termsPresetId : null,
            freight: qt.freight,
            additionalDiscount: qt.additionalDiscount,
            customerSignature: qt.customerSignature,
            customerSignedAt: parseDate(qt.customerSignedAt),
            revisionOfId: null, // set to null on update, resolved later
            originalQuoteId: null, // set to null on update, resolved later
            revisionNumber: qt.revisionNumber
          },
          create: {
            id: qt.id,
            quotationNo: qt.quotationNo,
            date: parseDate(qt.date) || new Date(),
            validUntil: parseDate(qt.validUntil),
            customerId: qCustId,
            subject: qt.subject,
            subtotal: qt.subtotal || 0,
            discountTotal: qt.discountTotal || 0,
            cgstTotal: qt.cgstTotal || 0,
            sgstTotal: qt.sgstTotal || 0,
            igstTotal: qt.igstTotal || 0,
            grandTotal: qt.grandTotal || 0,
            status: qt.status,
            terms: qt.terms,
            companyId: (qt.companyId && companyIds.has(qt.companyId)) ? qt.companyId : null,
            termsPresetId: (qt.termsPresetId && termsPresetIds.has(qt.termsPresetId)) ? qt.termsPresetId : null,
            freight: qt.freight,
            additionalDiscount: qt.additionalDiscount,
            customerSignature: qt.customerSignature,
            customerSignedAt: parseDate(qt.customerSignedAt),
            revisionOfId: null,
            originalQuoteId: null,
            revisionNumber: qt.revisionNumber
          }
        });

        for (const item of qt.items || []) {
          await tx.quotationItems.create({
            data: {
              quotationId: qt.id,
              productId: (item.productId && productIds.has(item.productId)) ? item.productId : null,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }

      // Second Pass: resolve self-referencing revision fields
      for (const qt of payload.quotations || []) {
        if (qt.revisionOfId || qt.originalQuoteId) {
          await tx.quotations.update({
            where: { id: qt.id },
            data: {
              revisionOfId: (qt.revisionOfId && quotationIds.has(qt.revisionOfId)) ? qt.revisionOfId : null,
              originalQuoteId: (qt.originalQuoteId && quotationIds.has(qt.originalQuoteId)) ? qt.originalQuoteId : null
            }
          });
        }
      }

      // Delete quotations not in payload
      const existing = await tx.quotations.findMany({ select: { id: true } });
      for (const eq of existing) {
        if (!incomingIds.includes(eq.id)) {
          try {
            await tx.quotationItems.deleteMany({ where: { quotationId: eq.id } });
            await tx.quotations.delete({ where: { id: eq.id } });
          } catch (e) {
            console.warn(`Could not delete quotation ${eq.id}:`, e);
          }
        }
      }
    }

    // 7. Save Invoices (Proforma Invoices)
    if (payload.proforma_invoices !== undefined) {
      const incomingIds = payload.proforma_invoices.map((i: any) => i.id);

      // Clean up invoice items first to prevent orphans
      await tx.invoiceItems.deleteMany({
        where: { invoiceId: { in: incomingIds } }
      });

      for (const inv of payload.proforma_invoices || []) {
        // Ensure customer exists
        let iCustId = inv.customerId;
        if (!customerIds.has(iCustId)) {
          await tx.customers.create({
            data: {
              id: iCustId,
              name: "Placeholder Customer",
              state: "Maharashtra"
            }
          });
          customerIds.add(iCustId);
        }

        await tx.invoices.upsert({
          where: { id: inv.id },
          update: {
            invoiceNo: inv.invoiceNo,
            quotationNo: (inv.quotationNo && quotationNos.has(inv.quotationNo)) ? inv.quotationNo : null,
            date: parseDate(inv.date) || new Date(),
            dueDate: parseDate(inv.dueDate),
            customerId: iCustId,
            subject: inv.subject,
            subtotal: inv.subtotal || 0,
            discountTotal: inv.discountTotal || 0,
            cgstTotal: inv.cgstTotal || 0,
            sgstTotal: inv.sgstTotal || 0,
            igstTotal: inv.igstTotal || 0,
            grandTotal: inv.grandTotal || 0,
            status: inv.status,
            terms: inv.terms,
            companyId: (inv.companyId && companyIds.has(inv.companyId)) ? inv.companyId : null,
            termsPresetId: (inv.termsPresetId && termsPresetIds.has(inv.termsPresetId)) ? inv.termsPresetId : null,
            freight: inv.freight,
            additionalDiscount: inv.additionalDiscount,
            customerSignature: inv.customerSignature,
            customerSignedAt: parseDate(inv.customerSignedAt)
          },
          create: {
            id: inv.id,
            invoiceNo: inv.invoiceNo,
            quotationNo: (inv.quotationNo && quotationNos.has(inv.quotationNo)) ? inv.quotationNo : null,
            date: parseDate(inv.date) || new Date(),
            dueDate: parseDate(inv.dueDate),
            customerId: iCustId,
            subject: inv.subject,
            subtotal: inv.subtotal || 0,
            discountTotal: inv.discountTotal || 0,
            cgstTotal: inv.cgstTotal || 0,
            sgstTotal: inv.sgstTotal || 0,
            igstTotal: inv.igstTotal || 0,
            grandTotal: inv.grandTotal || 0,
            status: inv.status,
            terms: inv.terms,
            companyId: (inv.companyId && companyIds.has(inv.companyId)) ? inv.companyId : null,
            termsPresetId: (inv.termsPresetId && termsPresetIds.has(inv.termsPresetId)) ? inv.termsPresetId : null,
            freight: inv.freight,
            additionalDiscount: inv.additionalDiscount,
            customerSignature: inv.customerSignature,
            customerSignedAt: parseDate(inv.customerSignedAt)
          }
        });

        for (const item of inv.items || []) {
          await tx.invoiceItems.create({
            data: {
              invoiceId: inv.id,
              productId: (item.productId && productIds.has(item.productId)) ? item.productId : null,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }

      // Delete invoices not in payload
      const existing = await tx.invoices.findMany({ select: { id: true } });
      for (const ei of existing) {
        if (!incomingIds.includes(ei.id)) {
          try {
            await tx.invoiceItems.deleteMany({ where: { invoiceId: ei.id } });
            await tx.invoices.delete({ where: { id: ei.id } });
          } catch (e) {
            console.warn(`Could not delete invoice ${ei.id}:`, e);
          }
        }
      }
    }

    // 8. Save Challans
    if (payload.challans !== undefined) {
      const incomingIds = payload.challans.map((ch: any) => ch.id);

      // Clean up delivery challan items first to prevent orphans
      await tx.deliveryChallanItems.deleteMany({
        where: { deliveryChallanId: { in: incomingIds } }
      });

      for (const ch of payload.challans || []) {
        // Ensure customer exists
        let chCustId = ch.customerId;
        if (!customerIds.has(chCustId)) {
          await tx.customers.create({
            data: {
              id: chCustId,
              name: "Placeholder Customer",
              state: "Maharashtra"
            }
          });
          customerIds.add(chCustId);
        }

        await tx.deliveryChallans.upsert({
          where: { id: ch.id },
          update: {
            challanNo: ch.challanNo,
            date: parseDate(ch.date) || new Date(),
            customerId: chCustId,
            vehicleNo: ch.vehicleNo,
            transporter: ch.transporter,
            lrNumber: ch.lrNumber,
            dispatchAddress: ch.dispatchAddress,
            status: ch.status,
            notes: ch.notes,
            companyId: (ch.companyId && companyIds.has(ch.companyId)) ? ch.companyId : null
          },
          create: {
            id: ch.id,
            challanNo: ch.challanNo,
            date: parseDate(ch.date) || new Date(),
            customerId: chCustId,
            vehicleNo: ch.vehicleNo,
            transporter: ch.transporter,
            lrNumber: ch.lrNumber,
            dispatchAddress: ch.dispatchAddress,
            status: ch.status,
            notes: ch.notes,
            companyId: (ch.companyId && companyIds.has(ch.companyId)) ? ch.companyId : null
          }
        });

        for (const item of ch.items || []) {
          await tx.deliveryChallanItems.create({
            data: {
              deliveryChallanId: ch.id,
              productName: item.productName || "Product",
              quantity: item.quantity || 1,
              hsnCode: item.hsnCode,
              description: item.description
            }
          });
        }
      }

      // Delete challans not in payload
      const existing = await tx.deliveryChallans.findMany({ select: { id: true } });
      for (const ec of existing) {
        if (!incomingIds.includes(ec.id)) {
          try {
            await tx.deliveryChallanItems.deleteMany({ where: { deliveryChallanId: ec.id } });
            await tx.deliveryChallans.delete({ where: { id: ec.id } });
          } catch (e) {
            console.warn(`Could not delete delivery challan ${ec.id}:`, e);
          }
        }
      }
    }

    // 9. Save Leads
    if (payload.leads !== undefined) {
      const incomingIds = payload.leads.map((ld: any) => ld.id);
      for (const ld of payload.leads || []) {
        await tx.leads.upsert({
          where: { id: ld.id },
          update: {
            customerId: (ld.customerId && customerIds.has(ld.customerId)) ? ld.customerId : null,
            name: ld.name,
            company: ld.company,
            email: ld.email,
            phone: ld.phone,
            value: ld.value || 0,
            status: ld.status,
            source: ld.source,
            notes: ld.notes,
            date: parseDate(ld.date),
            conversionStatus: ld.conversionStatus
          },
          create: {
            id: ld.id,
            customerId: (ld.customerId && customerIds.has(ld.customerId)) ? ld.customerId : null,
            name: ld.name,
            company: ld.company,
            email: ld.email,
            phone: ld.phone,
            value: ld.value || 0,
            status: ld.status,
            source: ld.source,
            notes: ld.notes,
            date: parseDate(ld.date),
            conversionStatus: ld.conversionStatus
          }
        });
      }

      // Delete leads not in payload
      const existing = await tx.leads.findMany({ select: { id: true } });
      for (const el of existing) {
        if (!incomingIds.includes(el.id)) {
          try {
            await tx.leads.delete({ where: { id: el.id } });
          } catch (e) {
            console.warn(`Could not delete lead ${el.id}:`, e);
          }
        }
      }
    }

    // 10. Save Subscriptions
    if (payload.subscriptions !== undefined) {
      const incomingIds = payload.subscriptions.map((sub: any) => sub.id);
      for (const sub of payload.subscriptions || []) {
        subscriptionIds.add(sub.id);

        // Ensure customer exists
        let sCustId = sub.customerId;
        if (!customerIds.has(sCustId)) {
          await tx.customers.create({
            data: {
              id: sCustId,
              name: "Placeholder Customer",
              state: "Maharashtra"
            }
          });
          customerIds.add(sCustId);
        }

        await tx.subscriptions.upsert({
          where: { id: sub.id },
          update: {
            customerId: sCustId,
            serviceName: sub.serviceName,
            amount: sub.amount || 0,
            billingCycle: sub.billingCycle,
            startDate: parseDate(sub.startDate) || new Date(),
            nextRenewalDate: parseDate(sub.nextRenewalDate) || new Date(),
            status: sub.status,
            description: sub.description
          },
          create: {
            id: sub.id,
            customerId: sCustId,
            serviceName: sub.serviceName,
            amount: sub.amount || 0,
            billingCycle: sub.billingCycle,
            startDate: parseDate(sub.startDate) || new Date(),
            nextRenewalDate: parseDate(sub.nextRenewalDate) || new Date(),
            status: sub.status,
            description: sub.description
          }
        });
      }

      // Delete subscriptions not in payload
      const existing = await tx.subscriptions.findMany({ select: { id: true } });
      for (const es of existing) {
        if (!incomingIds.includes(es.id)) {
          try {
            await tx.subscriptions.delete({ where: { id: es.id } });
          } catch (e) {
            console.warn(`Could not delete subscription ${es.id}:`, e);
          }
        }
      }
    }

    // 11. Save Reminders
    if (payload.reminders !== undefined) {
      const incomingIds = payload.reminders.map((rem: any) => rem.id);
      for (const rem of payload.reminders || []) {
        await tx.reminders.upsert({
          where: { id: rem.id },
          update: {
            title: rem.title,
            description: rem.description,
            dueDate: parseDate(rem.dueDate) || new Date(),
            status: rem.status,
            priority: rem.priority,
            relatedTo: rem.relatedTo,
            subscriptionId: (rem.subscriptionId && subscriptionIds.has(rem.subscriptionId)) ? rem.subscriptionId : null,
            customerId: (rem.customerId && customerIds.has(rem.customerId)) ? rem.customerId : null
          },
          create: {
            id: rem.id,
            title: rem.title,
            description: rem.description,
            dueDate: parseDate(rem.dueDate) || new Date(),
            status: rem.status,
            priority: rem.priority,
            relatedTo: rem.relatedTo,
            subscriptionId: (rem.subscriptionId && subscriptionIds.has(rem.subscriptionId)) ? rem.subscriptionId : null,
            customerId: (rem.customerId && customerIds.has(rem.customerId)) ? rem.customerId : null
          }
        });
      }

      // Delete reminders not in payload
      const existing = await tx.reminders.findMany({ select: { id: true } });
      for (const er of existing) {
        if (!incomingIds.includes(er.id)) {
          try {
            await tx.reminders.delete({ where: { id: er.id } });
          } catch (e) {
            console.warn(`Could not delete reminder ${er.id}:`, e);
          }
        }
      }
    }

  }, {
    timeout: 60000 // 60 seconds for bulk transaction
  });
}

export async function getFromPrisma() {
  const result: any = {};
  
  result.company_profiles = await prisma.companyProfiles.findMany({ include: { termsPresets: true } });
  result.customers = await prisma.customers.findMany();
  result.products = await prisma.products.findMany();
  
  const rawQuotations = await prisma.quotations.findMany({ include: { quotationItems: true } });
  result.quotations = rawQuotations.map(q => ({
    ...q,
    items: q.quotationItems
  }));
  
  const rawInvoices = await prisma.invoices.findMany({ include: { invoiceItems: true } });
  result.proforma_invoices = rawInvoices.map(i => ({
    ...i,
    items: i.invoiceItems
  }));
  
  const rawChallans = await prisma.deliveryChallans.findMany({ include: { deliveryChallanItems: true } });
  result.challans = rawChallans.map(c => ({
    ...c,
    items: c.deliveryChallanItems
  }));
  
  result.leads = await prisma.leads.findMany();
  result.subscriptions = await prisma.subscriptions.findMany();
  result.reminders = await prisma.reminders.findMany();
  
  const rawInventory = await prisma.inventoryItems.findMany({ include: { inventoryLogs: true } });
  result.inventory = rawInventory.map(inv => ({
    ...inv,
    logs: inv.inventoryLogs
  }));

  // Clean up format (e.g. mapping dates to string in JSON)
  return JSON.parse(JSON.stringify(result));
}
