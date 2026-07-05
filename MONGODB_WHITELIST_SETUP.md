# MongoDB Atlas IP Whitelist Setup

## Current Issue
Your MongoDB Atlas cluster requires IP whitelisting for security. The connection failed because your current IP address is not whitelisted.

## Quick Fix

### Option 1: Allow All IPs (Development Only - NOT for production)
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to your cluster: **Career Sync**
3. Click **Network Access** in the left sidebar
4. Click **Add IP Address**
5. Click **Allow Access from Anywhere** (adds `0.0.0.0/0`)
6. Click **Confirm**
7. Wait 1-2 minutes for changes to propagate

### Option 2: Whitelist Your Current IP (Recommended)
1. Get your current IP address by running:
   ```powershell
   Invoke-RestMethod -Uri "https://api.ipify.org?format=json"
   ```
2. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
3. Navigate to your cluster: **Career Sync**
4. Click **Network Access** in the left sidebar
5. Click **Add IP Address**
6. Enter your IP address from step 1
7. Add a comment like "Development Machine"
8. Click **Confirm**
9. Wait 1-2 minutes for changes to propagate

### Option 3: Use Atlas PowerShell Script (Automated)
Run the automated whitelist script:
```powershell
cd "c:\Users\vamsi\Desktop\Project Expo\backend\main-app\backend"
.\setup-mongodb-whitelist.ps1
```

## Verify Connection After Whitelisting
Run the test again:
```powershell
cd "c:\Users\vamsi\Desktop\Project Expo\backend\main-app\backend"
node test-login-persistence.js
```

## Expected Output
```
✅ MongoDB connected successfully!
   Database: Career Sync
   Host: Career Sync.n1t9tw0.mongodb.net
```

## MongoDB Atlas Credentials
- **Cluster**: Career Sync.n1t9tw0.mongodb.net
- **Database**: Career Sync
- **User**: harishbonu3_db_user
- **Connection String**: Already configured in .env

## Notes
- The test creates a user: `test@skillroute.ai` / `Test@1234`
- Use these credentials to test login persistence in the frontend
- After whitelisting, the backend server will connect automatically
