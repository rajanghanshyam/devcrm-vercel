import { getAccessToken, googleSignIn } from './google_auth';

export const triggerCloudBackup = async () => {
  let token = await getAccessToken();
  if (!token) {
    try {
      const result = await googleSignIn();
      if (!result) return false;
      token = result.accessToken;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // Backup data collected
  const allData = {
    settings: localStorage.getItem("qm_company_settings"),
    profiles: localStorage.getItem("qm_company_profiles"),
    customers: localStorage.getItem("qm_customers"),
    products: localStorage.getItem("qm_products"),
    quotations: localStorage.getItem("qm_quotations"),
    proformas: localStorage.getItem("qm_proformas"),
    challans: localStorage.getItem("qm_challans"),
    leads: localStorage.getItem("qm_leads"),
    subscriptions: localStorage.getItem("qm_subscriptions"),
    reminders: localStorage.getItem("qm_reminders"),
    inventory: localStorage.getItem("qm_inventory"),
    amazonOrders: [] // Firestore data would be added here
  };
  
  const fileContent = JSON.stringify(allData, null, 2);
  const metadata = {
    name: `QuotationMaker_Backup_${new Date().toISOString().split('T')[0]}.json`,
    mimeType: 'application/json'
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  try {
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });
    
    if (res.ok) {
        return true;
    } else {
        console.error("Failed to backup: ", await res.text());
        return false;
    }
  } catch (err) {
    console.error("Backup failed", err);
    return false;
  }
}

export const restoreFromCloud = async (fileId: string) => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const result = await googleSignIn();
        if (!result) return false;
        token = result.accessToken;
      } catch (e) {
        console.error(e);
        return false;
      }
    }

    try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.settings) localStorage.setItem("qm_company_settings", data.settings);
            if (data.profiles) localStorage.setItem("qm_company_profiles", data.profiles);
            if (data.customers) localStorage.setItem("qm_customers", data.customers);
            if (data.products) localStorage.setItem("qm_products", data.products);
            if (data.quotations) localStorage.setItem("qm_quotations", data.quotations);
            if (data.proformas) localStorage.setItem("qm_proformas", data.proformas);
            if (data.challans) localStorage.setItem("qm_challans", data.challans);
            if (data.leads) localStorage.setItem("qm_leads", data.leads);
            if (data.subscriptions) localStorage.setItem("qm_subscriptions", data.subscriptions);
            if (data.reminders) localStorage.setItem("qm_reminders", data.reminders);
            if (data.inventory) localStorage.setItem("qm_inventory", data.inventory);
            return true;
        } else {
            console.error("Restore failed: ", await res.text());
            return false;
        }
    } catch(err) {
        console.error("Restore failed: ", err);
        return false;
    }
}
