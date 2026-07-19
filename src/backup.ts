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

  // Backup data collected directly from direct database
  let allData = {};
  try {
    const dbRes = await fetch("/api/db/get");
    if (!dbRes.ok) {
      throw new Error(`HTTP error! Status: ${dbRes.status}`);
    }
    const dbData = await dbRes.json();
    if (dbData.success) {
      allData = dbData.data;
    } else {
      throw new Error(dbData.error || "Failed to fetch DB data");
    }
  } catch (err) {
    console.error("Failed to fetch direct database for backup:", err);
    return false;
  }
  
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
            // Restore directly to Prisma PostgreSQL backend database
            const saveRes = await fetch("/api/db/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (saveRes.ok) {
                const saveJson = await saveRes.json();
                if (saveJson.success) {
                    return true;
                }
            }
            console.error("Restore failed: Could not save restored payload to direct database.");
            return false;
        } else {
            console.error("Restore failed: ", await res.text());
            return false;
        }
    } catch(err) {
        console.error("Restore failed: ", err);
        return false;
    }
}
