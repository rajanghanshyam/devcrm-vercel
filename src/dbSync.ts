import { prisma } from './db';

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function saveToPrisma(payload: any) {
  await prisma.$transaction(async (tx) => {
    // 1. Delete all existing records in reverse dependency order to avoid foreign key constraints
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
    
    // Self-referencing quotation relation fix: drop foreign keys or just delete all
    // Quotations has revisionOfId and originalQuoteId.
    // Deleting many should work if we don't have restrict on them (they are SetNull)
    await tx.quotations.deleteMany();
    
    await tx.products.deleteMany();
    await tx.customers.deleteMany();
    await tx.subscriptionPolicies.deleteMany();
    await tx.termsPresets.deleteMany();
    await tx.companyProfiles.deleteMany();

    // 2. Insert Company Profiles and Terms
    for (const cp of payload.company_profiles || []) {
      await tx.companyProfiles.create({
        data: {
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
        }
      });

      for (const tp of cp.termsPresets || []) {
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

    // 3. Insert Customers
    for (const cust of payload.customers || []) {
      await tx.customers.create({
        data: {
          id: cust.id,
          name: cust.name,
          company: cust.company,
          email: cust.email,
          phone: cust.phone,
          gstin: cust.gstin,
          state: cust.state,
          billingAddress: cust.billingAddress,
          shippingAddress: cust.shippingAddress
        }
      });
    }

    // 4. Insert Products
    for (const prod of payload.products || []) {
      await tx.products.create({
        data: {
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
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

    // 5. Insert Inventory
    for (const inv of payload.inventory || []) {
      await tx.inventoryItems.create({
        data: {
          id: inv.id,
          sku: inv.sku,
          productName: inv.productName,
          category: inv.category,
          quantity: inv.quantity || 0,
          minQuantity: inv.minQuantity || 0,
          purchaseFrom: inv.purchaseFrom,
          unitPrice: inv.unitPrice || 0,
          latestPurchasePrice: inv.latestPurchasePrice,
          lastUpdated: parseDate(inv.lastUpdated) || new Date()
        }
      });

      for (const log of inv.logs || []) {
        await tx.inventoryLogs.create({
          data: {
            id: log.id,
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

    // 6. Insert Quotations
    for (const qt of payload.quotations || []) {
      await tx.quotations.create({
        data: {
          id: qt.id,
          quotationNo: qt.quotationNo,
          date: parseDate(qt.date) || new Date(),
          validUntil: parseDate(qt.validUntil),
          customerId: qt.customerId,
          subject: qt.subject,
          subtotal: qt.subtotal || 0,
          discountTotal: qt.discountTotal || 0,
          cgstTotal: qt.cgstTotal || 0,
          sgstTotal: qt.sgstTotal || 0,
          igstTotal: qt.igstTotal || 0,
          grandTotal: qt.grandTotal || 0,
          status: qt.status,
          terms: qt.terms,
          companyId: qt.companyId,
          termsPresetId: qt.termsPresetId,
          freight: qt.freight,
          additionalDiscount: qt.additionalDiscount,
          customerSignature: qt.customerSignature,
          customerSignedAt: parseDate(qt.customerSignedAt),
          revisionOfId: qt.revisionOfId,
          originalQuoteId: qt.originalQuoteId,
          revisionNumber: qt.revisionNumber
        }
      });

      let i = 0;
      for (const item of qt.items || []) {
        await tx.quotationItems.create({
          data: {
            quotationId: qt.id,
            productId: item.productId,
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

    // 7. Insert Invoices
    for (const inv of payload.proforma_invoices || []) {
      await tx.invoices.create({
        data: {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          quotationNo: inv.quotationNo,
          date: parseDate(inv.date) || new Date(),
          dueDate: parseDate(inv.dueDate),
          customerId: inv.customerId,
          subject: inv.subject,
          subtotal: inv.subtotal || 0,
          discountTotal: inv.discountTotal || 0,
          cgstTotal: inv.cgstTotal || 0,
          sgstTotal: inv.sgstTotal || 0,
          igstTotal: inv.igstTotal || 0,
          grandTotal: inv.grandTotal || 0,
          status: inv.status,
          terms: inv.terms,
          companyId: inv.companyId,
          termsPresetId: inv.termsPresetId,
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
            productId: item.productId,
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

    // 8. Insert Challans
    for (const ch of payload.challans || []) {
      await tx.deliveryChallans.create({
        data: {
          id: ch.id,
          challanNo: ch.challanNo,
          date: parseDate(ch.date) || new Date(),
          customerId: ch.customerId,
          vehicleNo: ch.vehicleNo,
          transporter: ch.transporter,
          lrNumber: ch.lrNumber,
          dispatchAddress: ch.dispatchAddress,
          status: ch.status,
          notes: ch.notes,
          companyId: ch.companyId
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

    // 9. Insert Leads
    for (const ld of payload.leads || []) {
      await tx.leads.create({
        data: {
          id: ld.id,
          customerId: ld.customerId,
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

    // 10. Insert Subscriptions
    for (const sub of payload.subscriptions || []) {
      await tx.subscriptions.create({
        data: {
          id: sub.id,
          customerId: sub.customerId,
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

    // 11. Insert Reminders
    for (const rem of payload.reminders || []) {
      await tx.reminders.create({
        data: {
          id: rem.id,
          title: rem.title,
          description: rem.description,
          dueDate: parseDate(rem.dueDate) || new Date(),
          status: rem.status,
          priority: rem.priority,
          relatedTo: rem.relatedTo,
          subscriptionId: rem.subscriptionId,
          customerId: rem.customerId
        }
      });
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
