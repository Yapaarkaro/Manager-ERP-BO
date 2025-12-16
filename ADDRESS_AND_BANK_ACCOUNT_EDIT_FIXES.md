# Address and Bank Account Edit Fixes

**Date:** December 2024  
**Scope:** Address editing screens and bank account editing  
**Objective:** Fix backend sync issues and add UI for additional address lines

---

## Issues Fixed

### 1. **Addresses Not Updating in Backend**

**Problem:**
- When editing addresses from address management or business summary screens, changes were not being synced to the backend
- Additional address lines were not being saved to backend

**Root Cause:**
- Edit screens were using direct `dataStore.updateAddress()` calls without backend sync
- Optimistic sync was not being used consistently
- Addresses without `backendId` were not being created in backend

**Fix Applied:**
- ✅ Updated `app/edit-address-simple.tsx` to use `optimisticUpdateAddress`
- ✅ Updated `app/edit-address.tsx` to use `optimisticUpdateAddress`
- ✅ Enhanced `utils/optimisticSync.ts` to handle addresses without `backendId` by creating them
- ✅ Ensured `additionalLines` are always included in backend sync

**Files Modified:**
- `app/edit-address-simple.tsx`
- `app/edit-address.tsx`
- `utils/optimisticSync.ts`

---

### 2. **Additional Address Lines UI Missing**

**Problem:**
- Edit address screens did not have UI to add/remove additional address lines
- Users could not manage additional lines when editing addresses

**Fix Applied:**
- ✅ Added UI for additional address lines in `app/edit-address-simple.tsx`
- ✅ Added UI for additional address lines in `app/edit-address.tsx`
- ✅ Added styles for additional line components
- ✅ Implemented add/remove functionality (max 3 additional lines)

**UI Features Added:**
- "Add Address Line" button (appears when less than 3 lines)
- Remove button (X icon) for each additional line
- Proper styling consistent with the rest of the app

**Files Modified:**
- `app/edit-address-simple.tsx` (UI + styles)
- `app/edit-address.tsx` (UI + styles)

---

### 3. **Bank Account Edits Not Syncing to Backend**

**Problem:**
- Bank account edits in `app/add-bank-account.tsx` were only updating DataStore
- Backend was not being updated when bank accounts were edited

**Fix Applied:**
- ✅ Updated `app/add-bank-account.tsx` to use `optimisticUpdateBankAccount` for edits
- ✅ Updated `app/add-bank-account.tsx` to use `optimisticAddBankAccount` for new accounts
- ✅ Ensured all bank account changes sync to backend

**Files Modified:**
- `app/add-bank-account.tsx`

---

## Technical Implementation

### Optimistic Sync Pattern

All edits now follow the optimistic sync pattern:

```typescript
// 1. Update DataStore immediately (optimistic)
optimisticUpdateAddress(addressId, updates, { showError: false });

// 2. Backend sync happens in background (non-blocking)
// - If address has backendId → Updates existing address
// - If address has no backendId → Creates new address in backend
// - Always includes additionalLines in sync
```

### Additional Lines Handling

**Before:**
- Additional lines were loaded incorrectly (doorNumber was included)
- No UI to add/remove lines
- Lines were not always synced to backend

**After:**
- Additional lines are loaded correctly (separate from doorNumber)
- Full UI to add/remove lines (max 3)
- Always synced to backend with all other fields

### Backend Sync Logic

The `optimisticUpdateAddress` function now:
1. Updates DataStore immediately
2. Checks if address has `backendId`:
   - **Has backendId:** Updates existing address in backend
   - **No backendId:** Creates new address in backend and updates DataStore with `backendId`
3. Always includes `additionalLines` in backend sync
4. Handles errors gracefully (logs but doesn't block UI)

---

## Files Modified

### Address Edit Screens
1. ✅ `app/edit-address-simple.tsx`
   - Added UI for additional address lines
   - Switched to optimistic sync
   - Fixed additional lines loading logic
   - Added styles for additional line components

2. ✅ `app/edit-address.tsx`
   - Added UI for additional address lines
   - Switched to optimistic sync
   - Added styles for additional line components

### Bank Account Edit Screen
3. ✅ `app/add-bank-account.tsx`
   - Switched to optimistic sync for edits
   - Switched to optimistic sync for new accounts

### Core Services
4. ✅ `utils/optimisticSync.ts`
   - Enhanced `optimisticUpdateAddress` to handle addresses without `backendId`
   - Ensured `additionalLines` are always included in backend sync
   - Improved error handling

---

## Testing Checklist

### Address Editing
- [x] Edit address from address management screen → Backend updated
- [x] Edit address from business summary screen → Backend updated
- [x] Add additional address lines → Saved to backend
- [x] Remove additional address lines → Updated in backend
- [x] Edit address without backendId → Created in backend
- [x] All address fields synced correctly

### Bank Account Editing
- [x] Edit bank account → Backend updated
- [x] Add new bank account → Backend updated
- [x] All bank account fields synced correctly

### UI/UX
- [x] Additional lines UI appears correctly
- [x] Add/remove buttons work properly
- [x] Max 3 additional lines enforced
- [x] Styles consistent with app design

---

## Result

✅ **All address edits now sync to backend**  
✅ **Additional address lines UI added and working**  
✅ **All bank account edits now sync to backend**  
✅ **Optimistic sync pattern ensures instant UI**  
✅ **Backend is always the source of truth**

---

**Status:** ✅ All Issues Fixed  
**Performance:** ⚡ Instant UI with background sync
